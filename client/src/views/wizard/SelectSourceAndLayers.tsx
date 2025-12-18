import { LinkResourceDto } from '@/shared/interfaces/dtos';
import { Button, Divider, FormControl, Grid, MenuItem, TextField, Typography } from '@mui/material';
import React from 'react';
import SearchIcon from '@mui/icons-material/Search';
import DetailedDataTable from '@/components/Tables/DetailedDataTable';
import { Specification } from '@/utils/mappers/toDataTable';
import { DataRow, TableData } from '@/interfaces';

interface LayersProps {
    onDataFromSource: (tableData: TableData) => void;
    sources: LinkResourceDto[];
    setSelectedSource: (selection: LinkResourceDto) => void;
    selectedSource?: LinkResourceDto;
    tableData?: TableData;
    selectedRows?: DataRow[];
    specification: Specification;
    selectedSourceId: string;
    onRowsSelectionChanged: (ids: string[]) => void;
    onSearchClick: () => void;
}
export function SelectSourceAndLayers({ onDataFromSource, sources, selectedSourceId, setSelectedSource, tableData, selectedRows, specification, onRowsSelectionChanged, onSearchClick }: LayersProps) {
    return (
        <div>
            <RenderSource onDataFromSource={onDataFromSource} sources={sources} selectedSourceId={selectedSourceId}
                setSelectedSource={setSelectedSource} specification={specification} onSearchClick={onSearchClick} />
            <Divider style={{ margin: '40px 0' }} />
            {tableData && <DetailedDataTable
                data={tableData} selectedRows={selectedRows}
                isSearchable={true}
                expandable={true}
                onSelectionChanged={onRowsSelectionChanged}
                sortingEnabled={true}
                pagination={true}
                rowsPerPage={25}
            ></DetailedDataTable>}
        </div>
    );
};

interface SourceProps {
    onDataFromSource: (tableData: TableData) => void;
    sources: LinkResourceDto[];
    setSelectedSource: (selection: LinkResourceDto) => void;
    selectedSourceId: string;
    specification: Specification;
    onSearchClick: () => void;
}
export function RenderSource({ onDataFromSource, sources, selectedSourceId, setSelectedSource, specification, onSearchClick }: SourceProps) {
    const onChange = async (id: string) => {
        const selectedSource = sources?.find(source => source.id === id);
        if (!selectedSource) return;
        setSelectedSource(selectedSource);
    }

    return (
        <Grid item xs={12}>
            <Typography variant="subtitle1">Välj Källa</Typography>
            <div style={{ display: 'flex', alignItems: 'inherit' }}>
                <FormControl fullWidth style={{ marginRight: 8, marginTop: 8 }}>
                    <TextField
                        select
                        InputProps={{
                            style: { height: '40px' }
                        }}
                        variant="outlined"
                        value={selectedSourceId}
                        onChange={(e) => onChange(e.target.value)}
                        style={{ width: '100%', height: '40px' }}
                    >
                        {sources ? (
                            sources.map((item) => (
                                <MenuItem key={item.id} value={item.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{item.title}</span>
                                </MenuItem>
                            ))
                        ) : (
                            <MenuItem disabled>Inga alternativ tillgängliga</MenuItem>
                        )}
                    </TextField>
                </FormControl>
                <Button
                    variant="outlined"
                    color="primary"
                    style={{ height: '40px', margin: '8px 0' }}
                    onClick={onSearchClick}
                >
                    <SearchIcon />
                </Button>
            </div>
        </Grid>
    );
};