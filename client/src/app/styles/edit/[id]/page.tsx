'use client';
import React, { use } from 'react';
import styles from "@/app/page.module.css";
import { useRouter } from "next/navigation";
import { GridLegacy as Grid, Typography } from '@mui/material';
import { StyleEditor } from '@/components/Editors/StyleEditor';

export default function Page(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);

    const {
        id
    } = params;

    const router = useRouter();

    const handleCancelClick = () => {
        router.back();
    };

    return (
        <main className={styles.main}>
            <Grid container spacing={2} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Grid item xs={12} md={12}>
                    <Typography sx={{ pl: '10px' }} variant="h5"></Typography>
                </Grid>
                <Grid item xs={12}>
                    <Grid item xs={12}>
                        <StyleEditor id={id} onRouterBackClick={handleCancelClick}></StyleEditor>
                    </Grid>
                </Grid>
            </Grid >
        </main >
    );
};