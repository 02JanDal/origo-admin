import { IMapper } from "@/interfaces";
import { DBLinkResource, DBMapControl } from "@/models";
import { DBLayerBase } from "@/models/layer.model";
import { ProxyResourceDto, ProxyRoleDto } from "@/shared/interfaces/proxy";
import { DBRole } from "@/models/permission.model";
import { linkResourceMapper } from "@/mappers/linkResourceMapper";
import { LinkResourceDto } from "@/shared/interfaces/dtos";
import { DBPublishedMap } from "@/models/publishedMap.model";

class proxyLayerMapper implements IMapper<DBLayerBase, ProxyResourceDto> {
  private _linkResourceMapper: IMapper<DBLinkResource, LinkResourceDto>;

  constructor() {
    this._linkResourceMapper = new linkResourceMapper();
  }
  toDto(model: DBLayerBase): ProxyResourceDto {
    console.log("AA", model);
    const src = this._linkResourceMapper.toDto(model.source as DBLinkResource);
    return {
      type: "layer",
      id: model._id.toString(),
      name: model.layer_id || model.name,
      sourceId: src.id!,
      source: src.name,
      sourceUrl: src.url,
    };
  }
  toDBModel(dto: ProxyResourceDto, create?: boolean | undefined): DBLayerBase {
    throw new Error(
      "Method not implemented since it is not needed for this mapper"
    );
  }
}

class proxySourceMapper implements IMapper<DBLinkResource, ProxyResourceDto> {
  toDto(model: DBLinkResource): ProxyResourceDto {
    return {
      type: "source",
      id: model._id.toString(),
      name: model.name,
      sourceUrl: model.url
    };
  }
  toDBModel(
    dto: ProxyResourceDto,
    create?: boolean | undefined
  ): DBLinkResource {
    throw new Error(
      "Method not implemented since it is not needed for this mapper"
    );
  }
}

class proxyControlMapper implements IMapper<DBMapControl, ProxyResourceDto> {
  toDto(model: DBMapControl): ProxyResourceDto {
    let name = (model.control as { name: string }).name;
    if (!name) {
      name = model.title;
    }

    return {
      type: "control",
      id: model._id.toString(),
      name: name,
    };
  }
  toDBModel(dto: ProxyResourceDto, create?: boolean | undefined): DBMapControl {
    throw new Error(
      "Method not implemented since it is not needed for this mapper"
    );
  }
}

class proxyPublishedMapMapper
  implements IMapper<DBPublishedMap, ProxyResourceDto>
{
  toDto(model: DBPublishedMap): ProxyResourceDto {
    return {
      type: "map",
      id: model._id.toString(),
      name: model.title,
    };
  }
  toDBModel(
    dto: ProxyResourceDto,
    create?: boolean | undefined
  ): DBPublishedMap {
    throw new Error(
      "Method not implemented since it is not needed for this mapper"
    );
  }
}

class proxyRoleMapper implements IMapper<DBRole, ProxyRoleDto> {
  toDto(model: DBRole): ProxyRoleDto {
    return {
      id: model._id.toString(),
      role: model.role,
      actors: model.actors.map((actor) => ({
        name: actor.name,
        type: actor.type,
      })),
      permissions: model.permissions.map((permission) => ({
        id: permission._id.toString(),
        type: permission.type,
      })),
    };
  }
  toDBModel(dto: ProxyRoleDto, create?: boolean): DBRole {
    throw new Error(
      "Method not implemented since it is not needed for this mapper"
    );
  }
}

export {
  proxyLayerMapper,
  proxyRoleMapper,
  proxySourceMapper,
  proxyPublishedMapMapper,
  proxyControlMapper,
};
