'use client';
import { GridLegacy as Grid, Typography, Button, ImageList, ImageListItem, styled, CardContent, Box } from "@mui/material";
import MainCard from "@/components/Cards/MainCard/MainCard";
import styles from "@/app/page.module.css";
import { MediaSelector } from "@/components/Selects/MediaSelector";
export default function Page() {
    return (
        <main className={styles.main}>
            <Grid container rowSpacing={4.5} columnSpacing={0}>
                <Grid item xs={12} sx={{ mb: -2.25, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '-2.25em' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Typography sx={{ pl: '10px' }} variant="h5">Media</Typography>
                    </div>
                </Grid>
                <Grid item xs={12} md={8} lg={12} sx={{ display: 'flex' }}>
                    <MainCard style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                        <MediaSelector maxHeight={800} showSelectedMediaInfo={true} />
                    </MainCard>
                </Grid>
            </Grid>
        </main>
    );
}
