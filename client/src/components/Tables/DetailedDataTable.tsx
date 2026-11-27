//"use client";
import * as React from 'react';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import { Box, Button, Checkbox, Chip, GridLegacy as Grid, Link, Menu, MenuItem, TextField, Popover, FormControlLabel, FormGroup, Badge } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import FilterListIcon from '@mui/icons-material/FilterList';
import { Column, DataRow, TableData } from '@/interfaces';
import TablePagination from '@mui/material/TablePagination';

interface CustomEvent {
    label: string;
    action: () => void;
}

interface DetailedDataTableProps {
    data: TableData | undefined;
    selectedRows?: DataRow[] | undefined;
    isSearchable?: boolean;
    expandable?: boolean;
    onAdd?: () => void;
    customOnAddLabel?: string;
    onEdit?: (id: string) => void;
    customEvents?: Array<{ label: string; action: (id: string) => void }>;
    onDelete?: (id: string) => void;
    onSelectionChanged?: (ids: string[]) => void;
    pagination?: boolean;
    rowsPerPage?: number;
    sortingEnabled?: boolean;
}

export default function DetailedDataTable({ data, selectedRows, isSearchable = false, expandable = false, onAdd,
    customOnAddLabel, onEdit, onDelete, onSelectionChanged, customEvents, pagination = false,
    sortingEnabled = false,
    rowsPerPage = 10 }: DetailedDataTableProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(0);
    const [selected, setSelected] = useState<string[]>(selectedRows ? selectedRows.map(row => row.id) : []);
    const [sortState, setSortState] = useState<{ field: string, direction: 'asc' | 'desc' } | null>(null);
    const prevDataRef = useRef<TableData | undefined>(undefined);
    const [selectAll, setSelectAll] = useState(false);
    const [columnFilters, setColumnFilters] = useState<{ [key: string]: string[] }>({});
    const [filterAnchorEl, setFilterAnchorEl] = useState<{ [key: string]: HTMLElement | null }>({});

    // Extract unique values from a column
    const getUniqueColumnValues = (field: string): string[] => {
        if (!data?.rows) return [];
        const uniqueValues = new Set<string>();
        data.rows.forEach(row => {
            const value = row[field];
            if (value !== null && value !== undefined) {
                // Handle different value types
                if (typeof value === 'boolean') {
                    uniqueValues.add(String(value));
                } else if (typeof value === 'object' && value !== null) {
                    if (Array.isArray(value)) {
                        value.forEach(item => {
                            if (typeof item === 'string') {
                                uniqueValues.add(item);
                            } else if (typeof item === 'object' && (item.hasOwnProperty('name') || item.hasOwnProperty('title'))) {
                                uniqueValues.add(item.name || item.title);
                            } else {
                                uniqueValues.add(JSON.stringify(item));
                            }
                        });
                    } else if (value.title) {
                        uniqueValues.add(value.title);
                    } else if (value.name) {
                        uniqueValues.add(value.name);
                    } else {
                        uniqueValues.add(JSON.stringify(value));
                    }
                } else {
                    uniqueValues.add(String(value));
                }
            }
        });
        return Array.from(uniqueValues).sort();
    };

    const filteredRows = useMemo(() => {
        let rows = data?.rows || [];

        // Apply global search filter
        if (searchTerm) {
            rows = rows.filter((row) =>
                Object.values(row).some(val =>
                    String(val).toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
        }

        // Apply column-specific filters
        Object.keys(columnFilters).forEach(field => {
            const selectedValues = columnFilters[field];
            if (selectedValues && selectedValues.length > 0) {
                rows = rows.filter(row => {
                    const value = row[field];
                    let stringValue = '';

                    if (value === null || value === undefined) return false;

                    // Convert value to string based on type
                    if (typeof value === 'boolean') {
                        stringValue = String(value);
                    } else if (typeof value === 'object' && value !== null) {
                        if (Array.isArray(value)) {
                            // For arrays, check if any item matches
                            return value.some(item => {
                                let itemStr = '';
                                if (typeof item === 'string') {
                                    itemStr = item;
                                } else if (typeof item === 'object' && (item.hasOwnProperty('name') || item.hasOwnProperty('title'))) {
                                    itemStr = item.name || item.title;
                                } else {
                                    itemStr = JSON.stringify(item);
                                }
                                return selectedValues.includes(itemStr);
                            });
                        } else if (value.title) {
                            stringValue = value.title;
                        } else if (value.name) {
                            stringValue = value.name;
                        } else {
                            stringValue = JSON.stringify(value);
                        }
                    } else {
                        stringValue = String(value);
                    }

                    return selectedValues.includes(stringValue);
                });
            }
        });

        return rows;
    }, [data?.rows, searchTerm, columnFilters]);

    useEffect(() => {
        if (JSON.stringify(prevDataRef.current) !== JSON.stringify(data)) {
            setSelected(selectedRows ? selectedRows.map(row => row.id) : []);
            prevDataRef.current = data;
        }
    }, [data, selectedRows]);

    const handleSort = (field: string) => {
        if (!sortingEnabled) return;
        setSortState(prevState => {
            if (prevState?.field === field) {
                return { field, direction: prevState.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { field, direction: 'asc' };
        });
    };

    const sortedAndPaginatedRows = useMemo(() => {
        let sorted = filteredRows;
        if (sortingEnabled && sortState) {
            sorted = [...filteredRows].sort((a, b) => {
                const aValue = a[sortState.field];
                const bValue = b[sortState.field];
                if (aValue < bValue) return sortState.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortState.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return pagination
            ? sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            : sorted;
    }, [filteredRows, sortState, sortingEnabled, pagination, page, rowsPerPage]);

    const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            const newSelected = data?.rows?.map((row) => row.id) ?? [];
            setSelected(newSelected);
            setSelectAll(true);
            onSelectionChanged?.(newSelected);
        } else {
            setSelected([]);
            setSelectAll(false);
            onSelectionChanged?.([]);
        }
    };

    const handleClick = (id: string) => {
        const selectedIndex = selected.indexOf(id);
        let newSelected: string[] = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selected, id);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selected.slice(1));
        } else if (selectedIndex === selected.length - 1) {
            newSelected = newSelected.concat(selected.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selected.slice(0, selectedIndex),
                selected.slice(selectedIndex + 1),
            );
        }

        setSelected(newSelected);
        setSelectAll(newSelected.length === (data?.rows?.length ?? 0));
        onSelectionChanged?.(newSelected);
    };

    const handleChangePage = (event: any, newPage: any) => {
        setPage(newPage);
    };

    const handleSearch = (event: any) => {
        setSearchTerm(event.target.value);
        setPage(0);
    };

    const clearSearch = () => {
        setSearchTerm('');
        setPage(0);
    };

    const isFiltered = searchTerm !== '';

    // Filter handlers
    const handleFilterClick = (field: string, event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        setFilterAnchorEl(prev => ({ ...prev, [field]: event.currentTarget }));
    };

    const handleFilterClose = (field: string) => {
        setFilterAnchorEl(prev => ({ ...prev, [field]: null }));
    };

    const handleFilterChange = (field: string, value: string) => {
        setColumnFilters(prev => {
            const currentValues = prev[field] || getUniqueColumnValues(field);
            const newValues = currentValues.includes(value)
                ? currentValues.filter(v => v !== value)
                : [...currentValues, value];
            return { ...prev, [field]: newValues };
        });
    };

    const handleSelectAllFilter = (field: string, checked: boolean) => {
        setColumnFilters(prev => {
            if (checked) {
                return { ...prev, [field]: getUniqueColumnValues(field) };
            } else {
                return { ...prev, [field]: [] };
            }
        });
    };

    const clearColumnFilter = (field: string) => {
        setColumnFilters(prev => {
            const newFilters = { ...prev };
            delete newFilters[field];
            return newFilters;
        });
        setPage(0);
    };

    const getActiveFilterCount = () => {
        return Object.keys(columnFilters).filter(key =>
            columnFilters[key] && columnFilters[key].length > 0 &&
            columnFilters[key].length < getUniqueColumnValues(key).length
        ).length;
    };

    // Render filter popover for a column
    const renderFilterPopover = (column: Column) => {
        const field = column.field;
        const uniqueValues = getUniqueColumnValues(field);
        const selectedValues = columnFilters[field] || uniqueValues;
        const allSelected = selectedValues.length === uniqueValues.length;
        const open = Boolean(filterAnchorEl[field]);

        return (
            <Popover
                key={`filter-${field}`}
                open={open}
                anchorEl={filterAnchorEl[field]}
                onClose={() => handleFilterClose(field)}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
            >
                <Box sx={{ p: 2, minWidth: 200, maxWidth: 300 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Filtrera {column.headerName}
                    </Typography>
                    <FormGroup>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={allSelected}
                                    indeterminate={selectedValues.length > 0 && !allSelected}
                                    onChange={(e) => handleSelectAllFilter(field, e.target.checked)}
                                />
                            }
                            label="Välj alla"
                        />
                        <Box sx={{ maxHeight: 300, overflowY: 'auto', mt: 1 }}>
                            {uniqueValues.map((value) => (
                                <FormControlLabel
                                    key={value}
                                    control={
                                        <Checkbox
                                            checked={selectedValues.includes(value)}
                                            onChange={() => handleFilterChange(field, value)}
                                        />
                                    }
                                    label={value || '(tom)'}
                                />
                            ))}
                        </Box>
                    </FormGroup>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                        <Button
                            size="small"
                            onClick={() => {
                                clearColumnFilter(field);
                                handleFilterClose(field);
                            }}
                        >
                            Rensa
                        </Button>
                        <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleFilterClose(field)}
                        >
                            Tillämpa
                        </Button>
                    </Box>
                </Box>
            </Popover>
        );
    };

    return (
        <Grid>
            <Grid container alignItems="center" justifyContent="space-between" sx={{ mb: '20px', height: '40px' }}>
                {isSearchable && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TextField
                            value={searchTerm}
                            onChange={handleSearch}
                            placeholder={`Sök ${data?.rows.length} resultat...`}
                            style={{ width: '220px', height: '40px' }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                                endAdornment: searchTerm && (
                                    <InputAdornment position="end">
                                        <IconButton onClick={clearSearch} size="small">
                                            <CancelIcon />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                                style: { height: '40px' }
                            }}
                            inputProps={{
                                style: { height: '40px', padding: '0 14px' }
                            }}
                        />
                        {(isFiltered || getActiveFilterCount() > 0) && (
                            <Typography variant="body2" sx={{ ml: 2, color: 'text.secondary' }}>
                                Visar {filteredRows.length} av {data?.rows.length} resultat
                                {getActiveFilterCount() > 0 && (
                                    <span> ({getActiveFilterCount()} filter aktiva)</span>
                                )}
                            </Typography>
                        )}
                    </Box>
                )}
                {onAdd && (
                    <Button variant="contained" onClick={() => onAdd()} startIcon={<AddIcon />}>
                        {customOnAddLabel || 'Lägg till'}
                    </Button>
                )}
            </Grid>
            <div>
                <TableContainer component={Paper}>
                    <Table aria-label="collapsible table">
                        <TableHead>
                            <TableRow>
                                {onSelectionChanged && (
                                    <TableCell padding="checkbox">
                                        <Checkbox
                                            indeterminate={selected.length > 0 && selected.length < (data?.rows?.length ?? 0)}
                                            checked={selectAll || (data?.rows && data.rows.length > 0 && selected.length === data.rows.length)}
                                            onChange={handleSelectAllClick}
                                        />
                                    </TableCell>
                                )}
                                {data?.columns.filter(column => !column.hide).map((column: Column) => {
                                    const hasActiveFilter = columnFilters[column.field] &&
                                        columnFilters[column.field].length > 0 &&
                                        columnFilters[column.field].length < getUniqueColumnValues(column.field).length;

                                    return (
                                        <TableCell
                                            key={column.field}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <Box
                                                    onClick={() => handleSort(column.field)}
                                                    sx={{ flex: 1, display: 'flex', alignItems: 'center' }}
                                                >
                                                    {column.headerName}
                                                    {sortingEnabled && sortState?.field === column.field && (
                                                        <span style={{ marginLeft: 4 }}>
                                                            {sortState.direction === 'asc' ? '▲' : '▼'}
                                                        </span>
                                                    )}
                                                </Box>
                                                <IconButton
                                                    size="small"
                                                    onClick={(e) => handleFilterClick(column.field, e)}
                                                    sx={{ padding: '4px' }}
                                                >
                                                    <Badge
                                                        color="primary"
                                                        variant="dot"
                                                        invisible={!hasActiveFilter}
                                                    >
                                                        <FilterListIcon fontSize="small" />
                                                    </Badge>
                                                </IconButton>
                                            </Box>
                                            {renderFilterPopover(column)}
                                        </TableCell>
                                    );
                                })}
                                {expandable && (
                                    <TableCell>Visa Mer</TableCell>
                                )}
                                {(onEdit || onDelete || customEvents) && (
                                    <TableCell align="right">Hantera</TableCell>
                                )}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data?.rows?.length ?? 0 > 0 ? (
                                sortedAndPaginatedRows.map((row) => (
                                    <RowContent
                                        key={row.id}
                                        row={row}
                                        isSelected={selected.includes(row.id)}
                                        columns={data!.columns}
                                        expandable={expandable}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                        onSelectionChanged={onSelectionChanged ? (() => handleClick(row.id)) : undefined}
                                        customEvents={customEvents}
                                        selectAll={selectAll}
                                    />
                                ))
                            ) : (
                                <RowContent
                                    row={{ id: "-1", title: "No data available" }}
                                    columns={[]}
                                    isSelected={false}
                                    expandable={false}
                                    selectAll={false}
                                />
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                {pagination && (
                    <TablePagination
                        rowsPerPageOptions={[rowsPerPage]}
                        component="div"
                        count={filteredRows.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                    />
                )}
            </div >
        </Grid>
    );
}


interface RowContentProps {
    row: DataRow;
    columns: Column[];
    isSelected: boolean;
    expandable: boolean;
    onEdit?: (id: string) => void;
    customEvents?: Array<{ label: string; action: (id: string) => void }>;
    onDelete?: (id: string) => void;
    onSelectionChanged?: (id: string) => void;
    selectAll: boolean;
}

function RowContent({ row, columns, isSelected, expandable, onEdit, onDelete, onSelectionChanged, customEvents, selectAll }: RowContentProps) {
    const [open, setOpen] = React.useState(false);

    const renderCellValue = (value: any) => {
        let renderedValue;
        if (typeof value === 'boolean') {
            return value ? <CheckCircleIcon sx={{ color: 'green' }} /> : <CancelIcon sx={{ color: 'red' }} />;
        }
        if (typeof value === 'object' && value !== null) {

            if (Array.isArray(value)) {
                return value.map((item, index) => {
                    if (typeof item === 'string') {
                        return (
                            <Chip key={index} label={item} variant="outlined" />
                        );
                    } else if (typeof item === 'object' && (item.hasOwnProperty('name') || item.hasOwnProperty('title'))) {
                        const label = item.name || item.title;
                        return (
                            <Chip key={index} label={label} variant="outlined" />
                        );
                    } else {
                        return JSON.stringify(value);
                    }
                });
            }
            else if (value.title) {
                return value.title;
            }
            else if (value.name) {
                return value.name;
            }
            else if (value.key && value.value) {
                return `${value.key}: ${value.value}`;
            }
            return JSON.stringify(value);
        }
        if (typeof value === 'string' && value.includes("http")) {
            return <Link href={value}>{value}</Link>
        } else {
            renderedValue = value;
        }

        if (Array.isArray(renderedValue) || React.isValidElement(renderedValue)) {
            return <div>{renderedValue}</div>;
        }

        return renderedValue;
    };
    return (
        <>

            <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
                {onSelectionChanged && (
                    <TableCell>
                        <Checkbox
                            checked={selectAll || isSelected}
                            onChange={() => onSelectionChanged(row.id)}
                        />
                    </TableCell>
                )
                }
                {columns.map((column) => (
                    !column.hide && (
                        <TableCell key={column.field}>
                            {renderCellValue(row[column.field])}
                        </TableCell>
                    )
                ))}
                {expandable && (
                    <TableCell>
                        <IconButton
                            aria-label="expand row"
                            size="small"
                            onClick={() => setOpen(!open)}
                        >
                            {open ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                    </TableCell>
                )}
                {(onEdit || onDelete || customEvents) && PopOverMenu && (
                    <TableCell align="right">
                        <PopOverMenu
                            onEdit={onEdit ? () => onEdit(row.id) : undefined}
                            customEvents={customEvents ? customEvents.map(event => ({
                                label: event.label,
                                action: () => event.action(row.id)
                            })) : undefined}
                            onDelete={onDelete ? () => onDelete(row.id) : undefined}
                        />
                    </TableCell>
                )}
            </TableRow>
            {expandable && (
                <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                        <Collapse in={open} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 1 }} component='div'>
                                <Grid container spacing={2}>
                                    {columns.map((column, index) => (
                                        <React.Fragment key={column.field}>
                                            <Grid item xs={6}>
                                                <Typography variant="subtitle2" gutterBottom>
                                                    {column.headerName}
                                                </Typography>
                                                <Box sx={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                                                    {renderCellValue(row[column.field])}
                                                </Box>
                                            </Grid>
                                            {(index + 1) % 2 === 0 && index !== columns.length - 1 && (
                                                <Grid item xs={12} />
                                            )}
                                        </React.Fragment>
                                    ))}
                                </Grid>
                            </Box>
                        </Collapse>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}

interface PopOverMenuProps {
    onEdit?: (id: string) => void;
    customEvents?: CustomEvent[];
    onDelete?: (id: string) => void;
}

export const PopOverMenu = ({ onEdit, onDelete, customEvents }: PopOverMenuProps) => {
    const ITEM_HEIGHT = 48;

    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleAction = (action: () => void) => {
        action();
        handleClose();
    };

    return (
        <div>
            <IconButton
                aria-label="more"
                id="long-button"
                aria-controls={open ? 'long-menu' : undefined}
                aria-expanded={open ? 'true' : undefined}
                aria-haspopup="true"
                onClick={handleClick}
            >
                <MoreVertIcon />
            </IconButton>
            <Menu
                id="long-menu"
                MenuListProps={{
                    'aria-labelledby': 'long-button',
                }}
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                PaperProps={{
                    style: {
                        maxHeight: ITEM_HEIGHT * 4.5,
                        width: '20ch',
                    },
                }}
            >
                {onEdit && (
                    <MenuItem key="edit" onClick={() => handleAction(() => onEdit("edit"))}>
                        Editera
                    </MenuItem>
                )}
                {customEvents && customEvents.map((event, index) => (
                    <MenuItem key={`custom-${index}`} onClick={() => handleAction(event.action)}>
                        {event.label}
                    </MenuItem>
                ))}
                {onDelete && (
                    <MenuItem key="delete" onClick={() => handleAction(() => onDelete("delete"))}>
                        Ta bort
                    </MenuItem>
                )}
            </Menu>
        </div>
    );
};