import { KeyValuePair } from "./KeyValuePairDto";

export interface GroupDto {
  id: string;
  name: string;
  title: string;
  abstract?: string;
  expanded: boolean;
  groups?: GroupDto[];
  extendedAttributes?: KeyValuePair[];
}
