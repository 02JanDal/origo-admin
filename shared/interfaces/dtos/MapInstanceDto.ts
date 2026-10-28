import { GroupDto } from "./GroupsDto";
import { LayerDto } from "./LayerDto";
import { MapControlDto } from "./MapControlDto";
import { MapSettingDto } from "./MapSettingDto";

export interface MapInstanceDto {
  id?: string;
  title: string;
  name: string;
  abstract?: string;
  isPublic?: boolean;
  instance: MapConfigDto;
}

export interface MapConfigDto {
  controls: MapControlDto[];
  settings?: MapSettingDto;
  groups: GroupDto[];
  layers: LayerDto[];
}

export interface MapInstanceListItemDto {
  id: string;
  title: string;
  name: string;
  abstract?: string;
  isPublic?: boolean;
  layers: number;
  settings: string;
  controls: number;
  isPublished?: boolean;
  publishedUrl?: string;
}

export interface PublishedMapDto extends PublishedMapBaseDto {
  map: PublishedMapConfigDto;
}

export interface PublishedMapBaseDto {
  id: string;
  comment?: string;
  title: string;
  name: string;
  abstract: string;
  mapInstanceId: string;
  publishedBy: string;
  publishedDate: Date;
}

export interface PublishedMapListItemDto {
  id: string;
  comment?: string;
  title: string;
  name: string;
  publishedDate: string;
  url: string;
}

export interface PublishedMapConfigDto {
  metadata: {
    title: string;
    abstract?: string;
  };
  controls: any;
  groups: any;
  source: any;
  layers: any;
  styles: any;
}