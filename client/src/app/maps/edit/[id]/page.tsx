'use client';
import { Box } from "@mui/material";
import MainCard from "@/components/Cards/MainCard/MainCard";
import styles from "@/app/page.module.css";
import { useEffect, useState } from "react";
import React from "react";
import Controls from "@/views/maps/Controls";
import { LayersEditor } from "@/components/Editors/LayersEditor/LayersEditor";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapInstanceService as service } from "@/api";
import Settings from "@/views/maps/Settings";
import { GroupDto, LayerDto, MapControlDto, MapSettingDto } from "@/shared/interfaces/dtos";
import JsonPreview from "@/views/maps/JsonPreview";
import Publish from "@/views/maps/Publish";
import { TabContainer } from "@/components/Tabs/TabContainer";
import { useApp } from "@/contexts/AppContext";

const items: Item[] = [
    { id: 0, label: 'Inställningar' },
    { id: 1, label: 'Kontroller' },
    { id: 2, label: 'Lager' },
    { id: 3, label: 'JSON-Preview' },
    { id: 4, label: 'Publicera' }
];
interface Item {
    id: number;
    label: string;
}

export default function Page({ params: { id } }: any) {
    const queryKey = "map";
    const { data } = useQuery({ queryKey: [queryKey], queryFn: () => service.fetch(id) });
    const [value, setValue] = React.useState(items[0].id);
    const [mapInstanceData, setMapInstanceData] = useState(data);
    const [groups, setGroups] = useState(null as unknown as GroupDto[]);
    const [layers, setLayers] = useState(null as unknown as LayerDto[]);
    const [key, setKey] = useState(0);
    const queryClient = useQueryClient();
    const { showToast } = useApp();

    useEffect(() => {
        if (data) {
            setKey(key + 1);
            if (data.instance?.groups != null) {
                setGroups(data.instance?.groups);
            }
            if (data.instance?.layers != null) {
                setLayers(data.instance.layers);
            }
            setMapInstanceData(data);
        }
    }, [data]);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setValue(newValue);
        setKey(key + 1);
    };

    const handleSaveLayersAndGroups = async (updatedGroups: GroupDto[], updatedLayers: LayerDto[]) => {
        try {
            const updatedData = {
                id: mapInstanceData!.id,
                title: mapInstanceData!.title,
                name: mapInstanceData!.name,
                abstract: mapInstanceData!.abstract,
                isPublic: mapInstanceData!.isPublic ?? false,
                instance: {
                    groups: updatedGroups,
                    layers: updatedLayers,
                    controls: mapInstanceData!.instance?.controls || [],
                    settings: mapInstanceData!.instance?.settings
                },
            };
            setMapInstanceData(updatedData);
            await service.update(updatedData?.id!, updatedData!);
            setKey(key + 1);
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            showToast('Ändringarna har sparats', 'success');

        } catch (error) {
            showToast('Ett fel inträffade. Ändringarna kunde inte sparas', 'error');
            console.error(`[${new Date().toISOString()}] ${error}`);
        }
    }

    const handleSaveSettings = async (title: string, name: string, settings: MapSettingDto, abstract?: string, isPublic?: boolean) => {
        try {
            const updatedData = {
                id: mapInstanceData!.id,
                title: title,
                name: name,
                abstract: abstract,
                isPublic: isPublic ?? false,
                instance: {
                    groups: mapInstanceData!.instance?.groups,
                    layers: mapInstanceData!.instance?.layers,
                    controls: mapInstanceData!.instance?.controls || [],
                    settings: settings
                },
            };
            setMapInstanceData(updatedData);
            await service.update(updatedData?.id!, updatedData!);
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            setKey(key + 1);
            showToast('Ändringarna har sparats', 'success');
        } catch (error) {
            showToast('Ett fel inträffade. Ändringarna kunde inte sparas', 'error');
            console.error(`[${new Date().toISOString()}] ${error}`);
        }
    }

    const handleSaveControls = async (controls: MapControlDto[]) => {
        try {
            const updatedData = {
                id: mapInstanceData!.id,
                title: mapInstanceData!.title,
                name: mapInstanceData!.name,
                abstract: mapInstanceData!.abstract,
                isPublic: mapInstanceData!.isPublic ?? false,
                instance: {
                    groups: mapInstanceData!.instance?.groups,
                    layers: mapInstanceData!.instance?.layers,
                    controls: controls,
                    settings: mapInstanceData!.instance?.settings
                },
            };
            setMapInstanceData(updatedData);
            await service.update(updatedData?.id!, updatedData!);
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            setKey(key + 1);
            showToast('Ändringarna har sparats', 'success');
        } catch (error) {
            showToast('Ett fel inträffade. Ändringarna kunde inte sparas', 'error');
            console.error(`[${new Date().toISOString()}] ${error}`);

        }
    }

    return (
        <main className={styles.main}>
            <MainCard style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box component='div' sx={{ width: '100%' }}>
                    <Box component='div' sx={{ width: '100%', height: 'fit-content' }}>
                        {mapInstanceData && <TabContainer items={items}>
                            <Settings
                                key={key}
                                onSave={handleSaveSettings}
                                title={mapInstanceData?.title}
                                name={mapInstanceData?.name}
                                abstract={mapInstanceData?.abstract || ""}
                                isPublic={mapInstanceData?.isPublic ?? false}
                                settings={mapInstanceData?.instance?.settings || null}
                            />
                            <Controls
                                selectedControls={mapInstanceData?.instance?.controls || []}
                                onSave={handleSaveControls}
                            />
                            <LayersEditor
                                setGroups={setGroups}
                                groups={groups || []}
                                setLayers={setLayers}
                                layers={layers || []}
                                onHandleSave={handleSaveLayersAndGroups}
                            />
                            <JsonPreview
                                updateKey={key}
                                id={mapInstanceData?.id!}
                            />
                            <Publish
                                id={mapInstanceData?.id!}
                            />
                        </TabContainer>}
                    </Box>
                </Box>
            </MainCard>

        </main >
    );
}