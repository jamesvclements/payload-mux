import { CollectionConfig } from 'payload/types';

const DefaultUploads: CollectionConfig = {
  slug: 'default-uploads',
  admin: {
    useAsTitle: 'Default Uploads',
  },
  upload: true,
  fields: []
}

export default DefaultUploads;