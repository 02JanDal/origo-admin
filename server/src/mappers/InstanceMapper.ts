import { IMapper } from "@/interfaces";
import { DBMapConfig, DBMapInstance } from "@/models";
import { GroupDto, MapConfigDto, MapInstanceDto, MapInstanceListItemDto } from "@/shared/interfaces/dtos";
import mongoose from "mongoose";
import mapControlMapper from "@/mappers/mapControlMapper";

export class instanceListItemMapper implements IMapper<DBMapInstance, MapInstanceListItemDto> {
  toDto(model: DBMapInstance, isPublished: boolean = false): MapInstanceListItemDto {
    return {
      id: model._id.toHexString(),
      title: model.title,
      name: model.name,
      abstract: model.abstract,
      layers: model.instance.layers ? model.instance.layers.length : 0,
      settings: model.instance.settings ? model.instance.settings.title : "",
      controls: model.instance.controls ? model.instance.controls.length : 0,
      isPublished: isPublished,
    };
  }
  toDBModel(dto: MapInstanceListItemDto, create: boolean): DBMapInstance {
    throw new Error("Method not implemented since it is not needed for this mapper");
  }
}

export class instanceMapper implements IMapper<DBMapInstance, MapInstanceDto> {
  toDto(model: DBMapInstance): MapInstanceDto {
    return {
      id: model._id.toHexString(),
      title: model.title,
      name: model.name,
      abstract: model.abstract,
      instance: mapDBConfigToConfigDto(model.instance),
    };
  }
  toDBModel(dto: MapInstanceDto, create: boolean): DBMapInstance {
    const dbMapInstance: DBMapInstance = {
      _id: new mongoose.Types.ObjectId(dto.id),
      title: dto.title,
      name: dto.name,
      abstract: dto.abstract,
      instance: mapConfigDtoToDBConfig(dto.instance),
    };

    if (!create) {
      dbMapInstance._id = new mongoose.Types.ObjectId(dto.id);
    }

    return dbMapInstance;
  }
}

function mapDBConfigToConfigDto(dbConfig: DBMapConfig): MapConfigDto {
  const mapper = new mapControlMapper();
  return {
    controls: dbConfig.controls!.map((control) => mapper.toDto(control)),
    settings: dbConfig.settings,
    groups: degenerateGroups(dbConfig.groups as any),
    layers: dbConfig.layers as any,
  };
}

function mapConfigDtoToDBConfig(configDto: MapConfigDto): DBMapConfig {
  const mapper = new mapControlMapper();
  return {
    controls: configDto.controls.map((control) => mapper.toDBModel(control)),
    settings: configDto.settings as any,
    groups: generateGroups(configDto.groups),
    layers: configDto.layers,
  };
}

function generateGroups(groups: GroupDto[]): any {
  return groups.map(({ extendedAttributes, ...group }) => {
    const groupId = group.id || new mongoose.Types.ObjectId();
    return {
      ...Object.fromEntries(extendedAttributes?.map(({ key, value }) => [key, value]) ?? []),
      ...group,
      id: groupId,
      groups: group.groups ? generateGroups(group.groups) : [],
    };
  });
}
function degenerateGroups(groups: any[]): GroupDto[] {
  return groups.map(({id, groups, name, title, abstract, expanded, ...rest}) => ({
    id,
    groups: degenerateGroups(groups),
    name,
    title,
    abstract,
    expanded,
    extendedAttributes: Object.entries(rest).map(([key, value]) => ({ key, value: value as string}))
  }))
}
