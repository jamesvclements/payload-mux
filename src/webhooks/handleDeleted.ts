import Mux from "@mux/mux-node";
import { PayloadHandler } from "payload/config";
import express from "express";

export const handleDeleted: PayloadHandler[] = [express.raw({ type: 'application/json' }), async (req, res) => {
  console.log(`Req body before parsing?`);
  console.log(req.body);
  /* Verify this webhook is coming from Mux */
  console.log(`Verifying signature ${req.headers['mux-signature']} against ${process.env.MUX_WEBHOOK_SIGNING_SECRET}...`)
  const verified = Mux.Webhooks.verifyHeader(req.body, req.headers['mux-signature'] as string, process.env.MUX_WEBHOOK_SIGNING_SECRET!);

  if (!verified) {
    console.log('Signature verification failed');
    res.status(401).json({ message: 'Signature verification failed' });
    return;
  }

  /* Parse the request body */
  const event = JSON.parse(req.body);

  /* Handle the event */
  console.log('Event received:');
  console.log(event);

  if (event.type === 'video.asset.deleted') {
    try {
      /* Check if we have a Video asset with the same ID */
      const assetId = event.object.id;
      const video = await req.payload.findByID({
        collection: 'videos',
        id: assetId
      });

      console.log('video asset');
      console.log(video);


      const documents = await req.payload.delete({
        collection: 'videos',
        id: assetId
      });

      console.log(`Deleted document based on assetId: ${assetId}`);
      console.log(JSON.stringify(documents, null, 2));

    } catch (err: any) {
      // findById() throws an error if it can't find the document, so catch and ignore it here */
      if (err.status === 404) {
        console.log(`No corresponding document found for assetId: ${event.object.id}`)
      } else {
        console.log(`Error finding or deleting document for assetId: ${event.object.id}`);
        res.status(err.status).json(err);
        return;
      }

    }
  } else {
    console.log(`Not handling event type: ${event.type}`);
  }
  /* Return with the proper 2xx status code so Mux knows we handled the event and doesn't retry */
  res.sendStatus(204);
}];
