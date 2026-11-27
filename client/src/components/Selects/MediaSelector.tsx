import { MediaDto } from "@/shared/interfaces/dtos";
import { Box, Button, GridLegacy as Grid, InputAdornment, TextField, Tooltip, Typography, styled } from "@mui/material";
import { useEffect, useState } from "react";
import {
    CloudUpload as CloudUploadIcon,
    CreateNewFolder as CreateNewFolderIcon,
    Delete as DeleteIcon,
    DescriptionRounded as DocumentIcon,
    Edit as EditIcon,
    Folder as FolderIcon,
    Search as SearchIcon
} from '@mui/icons-material';
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { MediaService as service } from '@/api';
import { useApp } from "@/contexts/AppContext";
import AlertDialog from "../Dialogs/AlertDialog";
import FormDialog from "@/components/Dialogs/FormDialog";
import OverwriteMediaDialog from "../Dialogs/OverwriteMediaDialog";

interface MediaSelectorProps {
    showSelectedMediaInfo?: boolean;
    onMediaSelect?: (fileInfo: { file: string, fileIncPath: string }) => void;
    mediaToSelect?: string
    maxHeight?: number;
    minHeight?: number;
}

export const MediaSelector = ({ onMediaSelect, maxHeight = 800, minHeight = 350, showSelectedMediaInfo, mediaToSelect }: MediaSelectorProps) => {
    const queryKey = "media";
    const [currentPath, setCurrentPath] = useState('root');
    const { data } = useQuery({ queryKey: [queryKey, currentPath], queryFn: () => service.fetchByFolder(currentPath)});
    const [selectedMedia, setselectedMedia] = useState(null as unknown as MediaDto);
    const [mediaData, setmediaData] = useState<MediaDto[]>([]);
    const [filterText, setFilterText] = useState('');
    const [filteredData, setFilteredData] = useState<MediaDto[]>([]);
    const [isAlertDialogOpen, setAlertDialogOpen] = useState(false);
    const [isFolderDialogOpen, setFolderDialogOpen] = useState(false);
    const [isRenameDialogOpen, setRenameDialogOpen] = useState(false);
    const [renameDialogValue, setRenameDialogValue] = useState('');
    const [overwriteFiles, setOverwriteFiles] = useState<Array<File>>([]);
    const queryClient = useQueryClient();
    const { showToast } = useApp();
    const VisuallyHiddenInput = styled('input')({
        clip: 'rect(0 0 0 0)',
        clipPath: 'inset(50%)',
        height: 1,
        overflow: 'hidden',
        position: 'absolute',
        bottom: 0,
        left: 0,
        whiteSpace: 'nowrap',
        width: 1,
    });

    useEffect(() => {
        if (data) {
            setmediaData(data);
            if (mediaToSelect) {
                let filename = extractFilename(mediaToSelect!);
                let selectedItem = data.find((x) => x.name === filename);
                setselectedMedia(selectedItem!);
            }

        }
    }, [data]);

    useEffect(() => {
        if (!data) return;
        const lowercasedFilter = filterText.toLowerCase();
        const filtered = data.filter(item => item.name.toLowerCase().includes(lowercasedFilter));
        setFilteredData(filtered);
    }, [data, filterText]);

    const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFilterText(event.target.value);
    };

    function extractFilename(url: string): string {
        const regex = /[^\/\\&\?]+\.\w{3,4}(?=([\?&].*$|$))/;
        const match = url.match(regex);
        return match ? match[0] : '';
    }

    const toggleCreateFolderDialog = async () => {
        if (isFolderDialogOpen) {
            setFolderDialogOpen(false);
        } else {
            setFolderDialogOpen(true);
        }
    };

    const handleSubmitFolder = async (formData: FormData) => {
        const folderName = formData.get('name');
        console.log(`[${new Date().toISOString()}] Creating folder: ${folderName}`);
        try {
            await service.createFolder(`${currentPath === 'root' ? '' : `${currentPath}/`}${folderName!.toString()}`);
            queryClient.invalidateQueries({ queryKey: [queryKey, currentPath] });
            showToast('Mappen har skapats', 'success');
            toggleCreateFolderDialog();
        } catch (error) {
            showToast('Kunde inte skapa mapp.', 'error');
            console.error(`[${new Date().toISOString()}] Error creating folder: ${error}`);
        }
    }

    const handleUpload = async (event: any) => {
        const files: Array<File> = Array.from(event.target.files);
        if (files.length > 0) {
            try {
                const currentFiles = await service.fetchByFolder(currentPath);
                const newFiles = [] as Array<File>;
                const overwritables = files.filter((newFile) => {
                    if ((currentFiles).find((file) => file.fieldname !== 'folders' && file.name === newFile.name)) {
                        return true;
                    } else {
                        newFiles.push(newFile);
                        return false;
                    }
                });
                if (overwritables.length > 0) {
                    if (newFiles.length > 0) {
                        handleSubmitUpload(newFiles);
                    }
                    setOverwriteFiles(overwritables);
                } else {
                    handleSubmitUpload(files);
                }
            } catch (error) {
                showToast('Kunde inte läsa mappen', 'error');
                console.error(`[${new Date().toISOString()}] Error when reading media files in folder '${currentPath}': ${error}`);
            }
        }
    };

    const handleSubmitUpload = async (files: File[]) => {
        try {
            await service.upload(files, currentPath);
            queryClient.invalidateQueries({ queryKey: [queryKey, currentPath] });
            showToast('Filen har laddats upp', 'success');
        } catch (error) {
            showToast('Filen kunde inte laddas upp', 'error');
            console.error(`[${new Date().toISOString()}] Error when uploading files: ${error}`);
        }
    };

    const toggleRenameDialog = async () => {
        if (isRenameDialogOpen) {
            setRenameDialogOpen(false);
        } else {
            setRenameDialogValue(selectedMedia?.filename || '');
            setRenameDialogOpen(true);
        }
    };

    const handleSubmitRename = async (formData: FormData) => {
        const elementType = selectedMedia.mimetype.startsWith('image/') ? 'icon' :
            selectedMedia.fieldname === 'folders' ? 'folder' : 'file';
        const currentName = selectedMedia.filename;
        // FormDialog does not allow submitting empty values, so we can safely assert that newName is present
        const newName = formData.get('name')?.toString()!;
        console.log(`[${new Date().toISOString()}] Renaming ${elementType} ${currentName} to ${newName}.`);
        try {
            if (elementType === 'folder') {
                setselectedMedia(await service.renameFolder(currentName, newName));
                showToast('Mappens namn har ändrats', 'success');
            } else {
                setselectedMedia(await service.renameFile(currentName, newName));
                showToast('Filens namn har ändrats', 'success');
            }
            queryClient.invalidateQueries({ queryKey: [queryKey, currentPath] });
            
            toggleRenameDialog();
        } catch (error) {
            showToast('Kunde inte ändra namnet.', 'error');
            console.error(`[${new Date().toISOString()}] Error renaming ${elementType}: ${error}`);
        }
    }

    const handleDeleteMedia = async () => {
        setAlertDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (selectedMedia) {
            try {
                if(selectedMedia.fieldname === 'folders') {
                    await service.deleteFolder(selectedMedia.id!);
                    showToast('Mappen har raderats', 'success');
                } else {
                    await service.deleteFile(selectedMedia.id!);
                    showToast('Filen har raderats', 'success');
                }
                queryClient.invalidateQueries({ queryKey: [queryKey, currentPath] });
                setselectedMedia(null as unknown as MediaDto);
                setAlertDialogOpen(false);
            } catch (error) {
                showToast(`Kunde inte radera ${selectedMedia.fieldname === 'folders' ? 'mappen' : 'filen'}.`, 'error');
                console.error(`[${new Date().toISOString()}] Error deleting the file: ${error}`);
                setAlertDialogOpen(false);
            }
        }
    };

    const handleMediaSelection = (item: MediaDto) => {
        let selectedItem = mediaData.find((x) => x.id === item.id);

        if (selectedMedia && selectedMedia.id === item.id) {
            setselectedMedia(null as unknown as MediaDto);
            if (onMediaSelect) {
                onMediaSelect({ file: '', fileIncPath: '' });
            }
            return;
        }

        setselectedMedia(selectedItem!);
        if (onMediaSelect) {
            onMediaSelect({ file: selectedItem!.filename, fileIncPath: selectedItem!.path });
        }
    };

    const handleMediaNavigation = (item: MediaDto) => {
        console.log(`Navigating into folder: ${item.filename}`);
        setCurrentPath(item.filename);
        setselectedMedia(null as unknown as MediaDto);
    };

    const formatName = (name: string, cropAt: number) => {
        let formattedName = name;
        const dotIndex = name.lastIndexOf('.');
        if (dotIndex > 0) {
            formattedName = name.substring(0, dotIndex);
        }
        formattedName = formattedName.replace(/_/g, ' ');
        formattedName = formattedName.charAt(0).toUpperCase() + formattedName.slice(1);
        if (formattedName.length > cropAt) {
            formattedName = formattedName.substring(0, cropAt) + '...';
        }
        return formattedName;
    }

    return (
        <Grid item xs={12} sx={{ border: '1px solid #E0E0E0' }}>
            <Box component="div" sx={{ borderBottom: '1px solid #E0E0E0', backgroundColor: '#fbfafa', height: '56px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" sx={{ ml: '10px', textTransform: 'uppercase' }} >Uppladdade filer</Typography>
                <Box component="div" >
                    <Tooltip title="Skapa ny mapp">
                        <span>
                            <Button
                                sx={{
                                    height: '40px',
                                    bgcolor: 'transparent',
                                    color: '#1677ff',
                                    '& .MuiSvgIcon-root': { fontSize: '2.1rem' },
                                    '&:hover': {
                                        bgcolor: 'transparent',
                                        color: '#1677ff',
                                    }
                                }}
                                component="label"
                                role={undefined}
                                variant="contained"
                                tabIndex={-1}
                                startIcon={<CreateNewFolderIcon />}
                                onClick={toggleCreateFolderDialog}
                            />
                        </span>
                    </Tooltip>
                    <Tooltip title="Ladda upp filer">
                        <span>
                            <Button
                                sx={{
                                    height: '40px',
                                    bgcolor: 'transparent',
                                    color: '#1677ff',
                                    '& .MuiSvgIcon-root': { fontSize: '2.1rem' },
                                    '&:hover': {
                                        bgcolor: 'transparent',
                                        color: '#1677ff',
                                    }
                                }}
                                component="label"
                                role={undefined}
                                variant="contained"
                                tabIndex={-1}
                                startIcon={<CloudUploadIcon />}
                            >
                                <VisuallyHiddenInput multiple type="file" onChange={handleUpload} />
                            </Button>
                        </span>
                    </Tooltip>
                    <Tooltip title="Ändra namn">
                        <span>
                            <Button
                                sx={{
                                    height: '40px',
                                    bgcolor: 'transparent',
                                    color: '#1677ff',
                                    '& .MuiSvgIcon-root': { fontSize: '2.1rem' },
                                    '&:hover': {
                                        bgcolor: 'transparent',
                                        color: '#1677ff',
                                    }
                                }}
                                component="label"
                                role={undefined}
                                variant="contained"
                                tabIndex={-1}
                                startIcon={<EditIcon />}
                                disabled={!selectedMedia}
                                onClick={toggleRenameDialog}
                            />
                        </span>
                    </Tooltip>
                    <Tooltip title="Radera">
                        <span>
                            <Button
                                sx={{
                                    height: '40px',
                                    bgcolor: 'transparent',
                                    color: '#1677ff',
                                    '& .MuiSvgIcon-root': { fontSize: '2.1rem' },
                                    '&:hover': {
                                        bgcolor: 'transparent',
                                        color: '#1677ff',
                                    }
                                }}
                                component="label"
                                role={undefined}
                                variant="contained"
                                tabIndex={-1}
                                startIcon={<DeleteIcon />}
                                disabled={!selectedMedia}
                                onClick={handleDeleteMedia}
                            />
                        </span>
                    </Tooltip>
                    <TextField
                        value={filterText}
                        onChange={handleFilterChange}
                        placeholder={`Sök ${data?.length} resultat...`}
                        sx={{ width: '220px', height: '40px', mr: '10px' }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                            style: { height: '40px' }
                        }}
                        inputProps={{
                            style: { height: '40px', padding: '0 14px' }
                        }}
                    />
                </Box>
            </Box>
            <Grid item xs={12} md={12} lg={12} sx={{ display: 'flex', maxHeight: `${maxHeight}px`, minHeight: `${minHeight}px` }}>
                <Grid container rowSpacing={4.5} columnSpacing={0} sx={{ mt: '1px', overflowY: 'auto' }}>
                    {currentPath !== 'root' ?
                        <Grid item key={-1} xs={6} sm={4} md={3} lg={2} sx={{ textAlign: 'center' }}>
                            <FolderIcon onDoubleClick={() => handleMediaNavigation({ name: '..', filename: (currentPath.includes('/') ? currentPath.replace(/\/[^/]+$/i, '') : 'root'), fieldname: 'folders', mimetype: 'folder'} as MediaDto)}
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    cursor: 'pointer',
                                    color: 'rgba(0, 0, 0, 0.54)',
                                    border: selectedMedia && selectedMedia.filename === 'root' ? '2px solid #1890ff' : 'none',
                                    boxShadow: selectedMedia && selectedMedia.filename === 'root' ? '0 0 10px #1890ff, 0 0 6px #1890ff80' : 'none'
                                }}
                            />
                            <Typography variant="body2" sx={{ mt: 1 }}>
                                {'../'}
                            </Typography>
                        </Grid> : null}
                    {filteredData.map((item, index) => (
                        <Grid item key={index} xs={6} sm={4} md={3} lg={2} sx={{ textAlign: 'center' }}>
                            {
                                // Display images using <img> elements, otherwise use appropriate mui icons
                                item.mimetype.startsWith('image/') ?
                                    <img style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '50%',
                                            objectFit: 'cover',
                                            cursor: 'pointer',
                                            border: selectedMedia && selectedMedia.id === item.id ? '2px solid #1890ff' : 'none',
                                            boxShadow: selectedMedia && selectedMedia.id === item.id ? '0 0 10px #1890ff, 0 0 6px #1890ff80' : 'none'
                                        }}
                                        src={`${item.path}?w=48px&h=48px&fit=crop&auto=format`}
                                        onClick={() => handleMediaSelection(item)}
                                    /> :
                                item.fieldname === 'folders' ?
                                    <FolderIcon onClick={() => handleMediaSelection(item)} onDoubleClick={() => handleMediaNavigation(item)}
                                        style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '50%',
                                            cursor: 'pointer',
                                            color: 'rgba(0, 0, 0, 0.54)',
                                            border: selectedMedia && selectedMedia.id === item.id ? '2px solid #1890ff' : 'none',
                                            boxShadow: selectedMedia && selectedMedia.id === item.id ? '0 0 10px #1890ff, 0 0 6px #1890ff80' : 'none'
                                        }}
                                    /> :
                                    <DocumentIcon onClick={() => handleMediaSelection(item)}
                                      style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '50%',
                                        cursor: 'pointer',
                                        color: 'rgba(0, 0, 0, 0.54)',
                                        border: selectedMedia && selectedMedia.id === item.id ? '2px solid #1890ff' : 'none',
                                        boxShadow: selectedMedia && selectedMedia.id === item.id ? '0 0 10px #1890ff, 0 0 6px #1890ff80' : 'none'
                                    }}/>
                            }
                            <Typography variant="body2" sx={{ mt: 1 }}>
                                {formatName(item.name, 20)}
                            </Typography>
                        </Grid>
                    ))}
                </Grid>
                {showSelectedMediaInfo && (
                    <Grid item xs={12} md={4} lg={4} sx={{ display: 'flex' }}>
                        <Box component="div" sx={{ width: '100%', display: 'flex', flexDirection: 'column', padding: '10px', borderLeft: '1px solid #E0E0E0' }}>
                            {selectedMedia ? (
                                <>
                                    <Box component="div" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Typography variant="h6">{formatName(selectedMedia.name, 45)}</Typography>
                                    </Box>
                                    <Box component="div">
                                        <Typography variant="h6" sx={{ mt: 1 }}>Filtyp: {selectedMedia.fieldname === 'folders' ? 'mapp' : selectedMedia.mimetype}</Typography>
                                    </Box>
                                </>
                            ) : <Typography sx={{ p: 2 }}>Välj en fil för att visa information.</Typography>}
                        </Box>
                    </Grid>
                )}
                <FormDialog open={isFolderDialogOpen} onClose={toggleCreateFolderDialog} title="Skapa ny mapp"
                    contentText="Fyll i ett unikt namn för mappen och tryck Skapa mapp. Undvik gärna specialtecken och blanksteg i mappnamnet eftersom det ingår i sökvägen till uppladdade filer."
                    onSubmit={handleSubmitFolder}
                    fieldToValidate="name"
                    textField={<TextField
                        autoFocus
                        required
                        margin="dense"
                        id="name"
                        name="name"
                        label="Namn på mappen"
                        type="text"
                        fullWidth
                        variant="standard"
                    />}
                />
                <FormDialog open={isRenameDialogOpen} onClose={toggleRenameDialog} title="Ändra namn"
                    contentText="Fyll i ett nytt unikt namn och tryck Ändra. Undvik gärna specialtecken och blanksteg i mappnamn eftersom de ingår i sökvägen till uppladdade filer."
                    submitButtonText="Ändra"
                    onSubmit={handleSubmitRename}
                    fieldToValidate="name"
                    textField={<TextField
                        autoFocus
                        required
                        margin="dense"
                        id="name"
                        name="name"
                        label="Nytt namn"
                        value={renameDialogValue}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                            setRenameDialogValue(event.target.value);
                        }}
                        type="text"
                        fullWidth
                        variant="standard"
                    />}
                />
                <OverwriteMediaDialog title="Skriva över filer?"
                    mediaToOverWrite={overwriteFiles}
                    onClose={() => setOverwriteFiles([])}
                    onSubmit={ (files) => {
                        handleSubmitUpload(files);
                        setOverwriteFiles([]);
                    }}
                />
                <AlertDialog open={isAlertDialogOpen} onConfirm={confirmDelete} contentText={`Vänligen bekräfta borttagning av ${selectedMedia?.mimetype === 'folder' ? "mappen": "filen"} ${selectedMedia?.name}!`}
                    onClose={() => setAlertDialogOpen(false)} title="Bekräfta borttagning">
                </AlertDialog>
            </Grid>
        </Grid>

    );
}
