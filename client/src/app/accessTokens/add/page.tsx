'use client';
import React, { useState } from 'react';
import { GridLegacy as Grid, Typography, Stack, TextField, InputLabel, Button, FormControlLabel, Switch, Box } from "@mui/material";
import MainCard from "@/components/Cards/MainCard/MainCard";
import styles from "@/app/page.module.css";
import { useRouter } from "next/navigation";
import { AccessTokenService as accessTokenService } from '@/api';
import { RouteService as service } from '@/api';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";
import Checkbox from '@mui/material/Checkbox';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { CreateAccessTokenDto, GroupedRoutes } from '@/shared/interfaces/dtos';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import InformationDialog from '@/components/Dialogs/InformationDialog';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useApp } from '@/contexts/AppContext';

export default function Page() {
    const queryKeyRoutes = "routes";
    const { data: groupedRoutes, isLoading, error } = useQuery({
        queryKey: [queryKeyRoutes],
        queryFn: () => service.fetchAll()
    });

    const router = useRouter();
    const [name, setName] = useState('');
    const [expiresAt, setExpiresAt] = useState(dayjs());
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [isAllAccess, setIsAllAccess] = useState(false);
    const [isConfirmTokenDialogOpen, setConfirmTokenDialogOpen] = useState(false);
    const [createdToken, setCreatedToken] = useState('');
    const { showToast, showToastAfterNavigation } = useApp();

    const handleCancelClick = () => {
        router.back();
    };

    const getTokenDialogText = () => {
        const copyToClipboard = () => {
            navigator.clipboard.writeText(createdToken).then(() => {
                console.info(`[${new Date().toISOString()}] Token copied to clipboard`);
            }).catch(err => {
                console.error(`[${new Date().toISOString()}] Failed to copy text: ${err}`);
            });
        };

        return (
            <>
                <Typography variant="body1" paragraph>
                    En ny API-nyckel har skapats och är giltig till <strong>{expiresAt.format('YYYY-MM-DD')}</strong>
                </Typography>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        bgcolor: 'grey.100',
                        p: 2,
                        borderRadius: 1,
                        mb: 2
                    }}
                >
                    <Typography
                        variant="body1"
                        component="pre"
                        sx={{
                            flexGrow: 1,
                            overflowX: 'auto',
                            fontFamily: 'monospace',
                            fontSize: '0.875rem'
                        }}
                    >
                        {createdToken}
                    </Typography>
                    <Button
                        startIcon={<ContentCopyIcon />}
                        onClick={copyToClipboard}
                        size="small"
                        sx={{ ml: 2 }}
                    >
                        Kopiera
                    </Button>
                </Box>
                <Typography variant="body1" paragraph>
                    Viktigt meddelande om din API-nyckel:
                </Typography>
                <Typography component="div">
                    <ol>
                        <li>Spara denna nyckel på en säker plats omedelbart.</li>
                        <li>Nyckeln kommer inte att visas igen av säkerhetsskäl.</li>
                        <li>Om du förlorar nyckeln måste du skapa en ny och uppdatera alla system som använder den.</li>
                        <li>Dela aldrig denna nyckel med obehöriga personer.</li>
                    </ol>
                </Typography>
                <Typography variant="body1" paragraph>
                    Se till att kopiera nyckeln nu innan du stänger denna dialog. När dialogen stängs kommer nyckeln inte längre att vara tillgänglig för visning.
                </Typography>
            </>
        );
    };

    const handleAddClick = async () => {
        const createAccessToken = { name, expiresAt: expiresAt.toDate(), permissions: selectedPermissions } as CreateAccessTokenDto;
        try {
            const response = await accessTokenService.create(createAccessToken);
            setCreatedToken(response.token);
            setConfirmTokenDialogOpen(true);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Error adding access token: ${error}`);
        }
    };

    const confirmCloseTokenDialog = async () => {
        setConfirmTokenDialogOpen(false);
        router.back();
        showToastAfterNavigation('API-nyckeln har skapats', 'success');
    }

    const handlePermissionChange = (permission: string) => {
        setSelectedPermissions(prev =>
            prev.includes(permission)
                ? prev.filter(p => p !== permission)
                : [...prev, permission]
        );
    };

    const handleAllAccessToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
        setIsAllAccess(event.target.checked);
        if (event.target.checked) {
            setSelectedPermissions(['*']);
        } else {
            setSelectedPermissions([]);
        }
    };

    const renderTree = (nodes: GroupedRoutes) => (
        <TreeItem
            key={nodes.route}
            itemId={nodes.route}
            label={
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={nodes.routes.every((route: any) => selectedPermissions.includes(route.permission))}
                            indeterminate={
                                nodes.routes.some((route: any) => selectedPermissions.includes(route.permission)) &&
                                !nodes.routes.every((route: any) => selectedPermissions.includes(route.permission))
                            }
                            onChange={() => {
                                const allPermissions = nodes.routes.map((route: any) => route.permission);
                                if (allPermissions.every(p => selectedPermissions.includes(p))) {
                                    setSelectedPermissions(prev => prev.filter(p => !allPermissions.includes(p)));
                                } else {
                                    setSelectedPermissions(prev => Array.from(new Set([...prev, ...allPermissions])));
                                }
                            }}
                        />
                    }
                    label={nodes.route}
                />
            }
        >
            {nodes.routes.map((route) => (
                <TreeItem
                    key={route.permission}
                    itemId={route.permission}
                    label={
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={selectedPermissions.includes(route.permission)}
                                    onChange={() => handlePermissionChange(route.permission)}
                                />
                            }
                            label={`${route.method}: ${route.path}`}
                        />
                    }
                />
            ))}
        </TreeItem>
    );

    return (
        <main className={styles.main}>
            <Grid container rowSpacing={4.5} columnSpacing={2.75}>
                <Grid item xs={12} sx={{ mb: -2.25 }}>
                    <Typography sx={{ pl: '10px' }} variant="h5">Lägg till API-nyckel</Typography>
                </Grid>
                <Grid item xs={12}>
                    <MainCard>
                        <Grid container spacing={1}>
                            <Grid item xs={12}>
                                <InputLabel>Namn</InputLabel>
                                <TextField
                                    id="api-key-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    fullWidth
                                    variant="outlined"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <InputLabel>Upphör att gälla</InputLabel>
                                <LocalizationProvider dateAdapter={AdapterDayjs}>
                                    <StaticDatePicker
                                        displayStaticWrapperAs="desktop"
                                        openTo="day"
                                        value={expiresAt}
                                        onChange={(newValue) => setExpiresAt(newValue!)}
                                    />
                                </LocalizationProvider>
                            </Grid>
                            <Grid item xs={12}>
                                <InputLabel>Behörigheter (Tillgång till)</InputLabel>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={isAllAccess}
                                            onChange={handleAllAccessToggle}
                                            name="allAccess"
                                            color="primary"
                                        />
                                    }
                                    label="Tillgång till alla rutter"
                                />
                                {isLoading ? (
                                    <Typography>Loading...</Typography>
                                ) : error ? (
                                    <Typography>Error loading routes</Typography>
                                ) : (!isAllAccess && (
                                    <SimpleTreeView
                                        aria-label="permissions tree"
                                        slots={{ expandIcon: ChevronRightIcon, collapseIcon: ExpandMoreIcon }}
                                    >
                                        {groupedRoutes?.map(renderTree)}
                                    </SimpleTreeView>
                                )
                                )}
                            </Grid>
                        </Grid>
                        <Grid item xs={12}>
                            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
                                <Button
                                    variant="contained"
                                    sx={{ mr: 1, backgroundColor: "red" }}
                                    onClick={handleCancelClick}
                                >
                                    Avbryt
                                </Button>
                                <Button
                                    variant="contained"
                                    disabled={!name || !expiresAt || selectedPermissions.length === 0}
                                    onClick={handleAddClick}
                                >
                                    Lägg till
                                </Button>
                            </Stack>
                        </Grid>
                    </MainCard>
                </Grid>
            </Grid>
            <InformationDialog
                open={isConfirmTokenDialogOpen}
                contentText={getTokenDialogText()}
                onClose={() => confirmCloseTokenDialog()}
                title="API-nyckel skapad!"
            />
        </main>
    );
}