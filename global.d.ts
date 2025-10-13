// global.d.ts
import { Mongoose } from 'mongoose';
interface Window {
  ethereum?: import('ethers').providers.ExternalProvider | any;
}


declare global {
  var mongoose: {
    conn: Mongoose | null;
    promise: Promise<Mongoose> | null;
  };
}