import MainCard from '@/components/Cards/MainCard/MainCard';
import { DataRow } from '@/interfaces';
import { LinkResourceDto } from '@/shared/interfaces/dtos';
import { GridLegacy as Grid, List, ListItem, Paper, Stack, Typography, styled } from '@mui/material';
import React from 'react';

interface CompleteProps {
    selectedRows: DataRow[];
    selectedSource: LinkResourceDto;
}
const DemoPaper = styled(Paper)(({ theme }) => ({
    width: 120,
    height: 120,
    padding: theme.spacing(2),
    ...theme.typography.body2,
    textAlign: 'center',
}));
export function Complete({ selectedRows, selectedSource }: CompleteProps) {
    return (
        <Stack>
            <Grid container spacing={2} sx={{ my: '5px' }}>
                <Grid item xs={12} md={12}>
                    <MainCard title={"Datakälla"}>
                        <List sx={{ py: 0 }}>
                            <ListItem>
                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={6}>
                                        <Stack spacing={0.5}>
                                            <Typography color="secondary">Titel:</Typography>
                                            <Typography>{selectedSource.title}</Typography>
                                        </Stack>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Stack spacing={0.5}>
                                            <Typography color="secondary">type:</Typography>
                                            <Typography style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{selectedSource.type}</Typography>
                                        </Stack>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Stack spacing={0.5}>
                                            <Typography color="secondary">Url:</Typography>
                                            <Typography>{selectedSource.url}</Typography>
                                        </Stack>
                                    </Grid>
                                </Grid>
                            </ListItem>
                        </List>
                    </MainCard>
                </Grid>
            </Grid>
            <Grid container spacing={2} sx={{ my: '5px' }}>
                {selectedRows.map((row, index) => (
                    <Grid item xs={12} md={6} key={index}>
                        <MainCard style={{ minHeight: '380px' }} title="Lagerinformation">
                            <List sx={{ py: 0 }}>
                                {Object.entries(row).map(([key, value], entryIndex) => (
                                    <ListItem key={`entry-${entryIndex}`}>
                                        <Grid container spacing={3}>
                                            <Grid item xs={12} md={6}>
                                                <Stack spacing={0.5}>
                                                    <Typography color="secondary">{key.charAt(0).toUpperCase() + key.slice(1)}</Typography>
                                                    <Typography style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                                        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') :
                                                            typeof value === 'object' && value !== null ? (value.name || JSON.stringify(value)) :
                                                                value}
                                                    </Typography>
                                                </Stack>
                                            </Grid>
                                        </Grid>
                                    </ListItem>
                                ))}
                            </List>
                        </MainCard>
                    </Grid>
                ))}
            </Grid>
        </Stack>
    );
}