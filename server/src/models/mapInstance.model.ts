import mongoose from "mongoose";
import mongodb from "mongodb";
import { DBMapControl, mapControlSchema } from "./mapControl.model";
import { DBMapSetting, mapSettingSchema } from "./mapSetting.model";

interface DBMapInstance {
  _id: mongodb.ObjectId;
  title: string;
  name: string;
  abstract?: string;
  instance: DBMapConfig;
}

interface DBMapConfig {
  controls?: DBMapControl[];
  settings?: DBMapSetting;
  groups?: Object;
  layers?: Object[];
}

const mapConfigSchema = new mongoose.Schema<DBMapConfig>({
  controls: { type: [mapControlSchema], required: false },
  settings: { type: mapSettingSchema, required: false },
  groups: { type: Object, required: false },
  layers: { type: [Object], required: false },
});

const mapInstanceSchema = new mongoose.Schema<DBMapInstance>({
  title: { type: String, required: true },
  name: { type: String, required: true },
  abstract: { type: String, required: false },
  instance: { type: mapConfigSchema, required: true },
});

const MapInstanceModel = mongoose.model<DBMapInstance>("MapInstance", mapInstanceSchema);

export { DBMapInstance, DBMapConfig, MapInstanceModel, mapInstanceSchema };
