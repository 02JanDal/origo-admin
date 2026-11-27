"use client";
import styles from "@/app/page.module.css";
import * as React from "react";
import { GridLegacy as Grid, Typography } from "@mui/material";
import { DashboardService as service } from '@/api';
import ReportCard from "@/components/Cards/ReportCard/ReportCard";
import DetailedDataTable from "@/components/Tables/DetailedDataTable";
import { mapDataToTableFormat } from "@/utils/mappers/toDataTable";
import mapSpec from "@/assets/specifications/tables/mapInstanceTableSpecification.json";
import { useQuery } from "@tanstack/react-query";
import { DashboardDto } from "@/shared/interfaces/dtos";

export default function Dashboard() {
    const queryKey = 'dashboard';
    const { data } = useQuery({ queryKey: [queryKey], queryFn: () => service.fetchAll() as any as DashboardDto });

    return (
        <main className={styles.main}>
            <Grid container rowSpacing={4.5} columnSpacing={2.75}>
                <Grid item xs={12} sx={{ mb: -2.25 }}>
                    <Typography variant="h5">Dashboard</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={3}>
                    <ReportCard
                        title="Publicerade kartinstanser"
                        count={data?.publishedMaps}
                        icon="Map"
                        iconColor="#52c41a"
                        url="/maps"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={3}>
                    <ReportCard
                        title="Ej Publicerade kartinstanser"
                        count={data?.unPublishedMaps}
                        icon="Map"
                        iconColor="#ff4d4f"
                        url="/maps"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={3}>
                    <ReportCard
                        title="Tillgängliga lager"
                        count={data?.layers}
                        icon="Layers"
                        url="/wfs"
                    />

                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={3}>
                    <ReportCard
                        title="Tillgängliga Länkresurser"
                        count={data?.sources}
                        icon="InsertLink"
                        url="/sources/links"
                    />
                </Grid>
                <Grid item xs={12} md={12} lg={12}>
                    <div>
                        <Typography variant="h5">Kartinstanser</Typography>
                    </div>
                    {data && data.mapInstances &&
                        <DetailedDataTable
                            pagination={true}
                            rowsPerPage={10}
                            data={mapDataToTableFormat(data.mapInstances, mapSpec.specification)}
                        ></DetailedDataTable>}
                </Grid>
                <Grid item xs={12} md={12} lg={12}>
                    <Grid
                        container
                        alignItems="center"
                        justifyContent="space-between"
                    >
                    </Grid>
                </Grid>
                {data?.swaggerUri &&
                    <Grid item xs={12} md={12} lg={12}>
                        <ReportCard
                            title="Swagger"
                            count={data?.swaggerUri}
                            icon="DataObject"
                            url={data?.swaggerUri}
                        />
                    </Grid>}
            </Grid>
        </main >
    );
}
