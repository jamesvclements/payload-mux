import { CollectionAfterDeleteHook } from "payload/types";
import Mux from '@mux/mux-node';

const { Video } = new Mux();

const afterDelete: CollectionAfterDeleteHook =
  async ({ id }) => {
    try {
      console.log(`Deleting asset: ${id} from Mux...`)
      await Video.Assets.del(id as string);
    } catch (err) {
      console.log(`Error deleting asset: ${id} from Mux...`)
      console.log(err);
      throw err;
    }
  }

export default afterDelete;