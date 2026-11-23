'use client';
import React, { useState } from 'react';
import { Grid, Typography, Button, Stack } from "@mui/material";
import MainCard from "@/components/Cards/MainCard/MainCard";
import styles from "@/app/page.module.css";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { ProxyCacheService as service } from '@/api';
import { useApp } from '@/contexts/AppContext';

export default function Page() {
    const queryKey = "proxyCache";
    const queryClient = useQueryClient();
    const { showToast } = useApp();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { data: status } = useQuery({
        queryKey: [queryKey],
        queryFn: () => service.getStatus()
    });

    const handleRefreshClick = async () => {
        setIsRefreshing(true);
        try {
            const refreshed = await service.refresh();
            queryClient.setQueryData([queryKey], refreshed);
            showToast('Proxy-cachen har förnyats', 'success');
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Failed to refresh proxy cache: ${error}`);
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <main className={styles.main}>
            <Grid container rowSpacing={4.5} columnSpacing={2.75}>
                <Grid item xs={12} sx={{ mb: -2.25 }}>
                    <Typography sx={{ pl: '10px' }} variant="h5">Proxy-cache</Typography>
                </Grid>
                <Grid item xs={12}>
                    <MainCard>
                        <Stack spacing={2} alignItems="flex-start">
                            <Typography variant="body1">
                                Proxyn cachar roller, behörigheter och resurser. Cachen förnyas när servern startar
                                {status?.refreshOnSave === false ? '. Förnyelse vid sparning är avstängd (PROXY_CACHE_REFRESH_ON_SAVE), så förnya cachen här efter ändringar.' : ' och när något sparas. Förnya den manuellt om ändringar gjorts direkt i databasen.'}
                            </Typography>
                            <Typography variant="body1">
                                Senast förnyad: <strong>{status?.lastUpdated ? dayjs(status.lastUpdated).format('YYYY-MM-DD HH:mm:ss') : '–'}</strong>
                            </Typography>
                            <Button variant="contained" onClick={handleRefreshClick} disabled={isRefreshing}>
                                {isRefreshing ? 'Förnyar…' : 'Förnya proxy-cache'}
                            </Button>
                        </Stack>
                    </MainCard>
                </Grid>
            </Grid>
        </main>
    );
}
