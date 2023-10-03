import { CollectionBeforeChangeHook } from "payload/types";
import { getIncomingFiles } from "../utils/getIncomingFiles";
import Mux from '@mux/mux-node';
import delay from "../utils/delay";

const { Video } = new Mux();

const beforeChangeHook: CollectionBeforeChangeHook =
  async ({ req, data: originalData, operation, originalDoc }) => {
    const data = { ...originalData };
    try {
      console.log(`beforeChangeHook: ${operation}`);
      console.log('data');
      console.log(originalData);
      const files = getIncomingFiles({ req, data: originalData })

      if (files.length > 0) {

        /* If this is an update, delete the old video first */
        if (operation === 'update' && originalDoc?.id) {
          console.log(`Deleting original asset: ${originalDoc.id}...`)
          const response = await Video.Assets.del(originalDoc.id);
          console.log('Delete response');
          console.log(response);
        }

        /* For now, we only support one video at a time */
        const file = files[0];

        console.log('file');
        console.log(file);

        let upload = await Video.Uploads.create({
          new_asset_settings: { playback_policy: 'public' },

        });

        console.log('upload');
        console.log(upload);

        /* Upload contains a signed Google Cloud Storage URL that you can use to upload a file directly to GCS */
        /* Upload the file directly to GCS using the signed URL */

        const response = await fetch(upload.url, {  // replace `upload.signed_url` with the signed URL from your code
          method: 'PUT',
          headers: {
            'Content-Type': file.mimeType,  // replace `file.type` with the MIME type of your file
          },
          body: file.buffer,  // your file data
        });

        console.log('response');
        console.log(response);

        if (!response.ok) {
          throw new Error(`Error uploading file: ${response.statusText}`);
        }

        /* Poll the upload until it's completed */
        /* Todo — this is not recommended by Mux, we should use webhooks instead. But how do we fail this hook if the upload fails? */

        let updatedUpload = await Video.Uploads.get(upload.id);
        console.log('updatedUpload');
        console.log(updatedUpload);
        let delayDuration = 1500;
        while (updatedUpload.status === 'waiting') {
          console.log(`Uploading is waiting, trying again in ${delayDuration}ms`);
          await delay(delayDuration);
          delayDuration = delayDuration * 1.5;
          updatedUpload = await Video.Uploads.get(upload.id);
        }

        if (updatedUpload.status === 'errored' || updatedUpload.status === 'cancelled' || updatedUpload.status === 'timed_out') {
          throw new Error(`Unable to upload file: ${updatedUpload.status}`);
        }

        /* Now, get the asset and append its' information to the doc */
        let asset = await Video.Assets.get(updatedUpload.asset_id!);
        /* Poll until it's prepared so we can get the aspect ratio, duration, etc */
        delayDuration = 1500;
        while (asset.status === 'preparing') {
          console.log(`Asset is preparing, trying again in ${delayDuration}ms`);
          await delay(delayDuration);
          delayDuration = delayDuration * 1.5;
          asset = await Video.Assets.get(updatedUpload.asset_id!);
        }

        if (asset.status === 'errored') {
          throw new Error(`Unable to get asset: ${asset.status}`);
        }

        console.log('asset')
        console.log(asset);

        /* Map Mux data to Payload fields */
        /* If any of these throw an error, the hook will fail and the document will not be saved */
        /* That's the behavior we want, since our front-end will be expecting this data */
        /* Todo – I can't tell if Payload is expecting _id or id when we override the ID field */
        if (operation === 'create') {
          data._id = asset.id;
          data.id = asset.id;
        }
        /* Assume the first playback ID is what we'll use on the front-end */
        data.playbackId = asset.playback_ids![0].id;
        /* Reformat Mux's aspect ratio (e.g. 16:9) to be CSS-friendly (e.g. 16/9) */
        data.aspectRatio = asset.aspect_ratio!.replace(':', '/');
        data.duration = asset.duration;


        // The URL you get back from the upload API is resumable, and the file can be uploaded using a `PUT` request (or a series of them).


        // The upload may not be updated immediately, but shortly after the upload is finished you'll get a `video.asset.created` event and the upload will now have a status of `asset_created` and a new `asset_id` key.
        // let updatedUpload = await Video.Uploads.get(upload.id);

        // Or you could decide to go get additional information about that new asset you created.
        // let asset = await Video.Assets.get(updatedUpload['asset_id']);
      }
    } catch (err: unknown) {
      // req.payload.logger.error(
      //   `There was an error while uploading files corresponding to the collection ${collection.slug} with filename ${data.filename}:`,
      // )
      req.payload.logger.error(
        `There was an error while uploading files corresponding to the collection with filename ${data.filename}:`,
      )
      req.payload.logger.error(err)
      throw err;
    }
    return data
  }

export default beforeChangeHook;