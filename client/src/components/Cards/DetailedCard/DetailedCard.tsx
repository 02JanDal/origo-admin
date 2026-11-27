import * as React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/GridLegacy';
import Divider from '@mui/material/Divider';

interface DetailedCardProps {
    data: {
        [key: string]: string | string[];
    };
    header?: string | '';
    layout?: 'vertical' | 'horizontal';
    design?: 'card' | 'none';
}

export default function DetailedCard({ data, header, layout = 'horizontal', design = 'none' }: DetailedCardProps) {
    const isStringArray = (value: any): value is string[] => {
        return Array.isArray(value) && value.every(item => typeof item === 'string');
    };

    const regularData = Object.entries(data).filter(([key, value]) => !isStringArray(value));
    const chipData = Object.entries(data).filter(([key, value]) => isStringArray(value));

    const renderContent = () => {
        if (layout === 'vertical') {
            return (
                <>
                    {regularData.map(([key, value], index) => (
                        <React.Fragment key={index}>
                            <Typography sx={{ fontSize: 14 }} color="text.secondary">
                                {key}
                            </Typography>
                            <Typography sx={{ mb: 1.5 }} color="text.primary">
                                {typeof value === "string" ? value : value.join(", ")}
                            </Typography>
                            {index < regularData.length - 1 && <Divider />}
                        </React.Fragment>
                    ))}
                </>
            );
        } else {
            return (
                <Grid container spacing={1} sx={{ mt: 1 }}>
                    {regularData.map(([key, value], index) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
                            <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                                {key}
                            </Typography>
                            <Typography sx={{ mb: 1.5 }} color="text.primary">
                                {typeof value === "string" ? value : value.join(", ")}
                            </Typography>
                        </Grid>
                    ))}
                    <Grid item xs={12}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                            {chipData.map(([key, values], index) => (
                                <div key={index}>
                                    <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                                        {key}
                                    </Typography>
                                    <div>
                                        {Array.isArray(values) && values.map((val, chipIndex) => (
                                            <Chip key={chipIndex} label={val} size="small" />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Grid>
                </Grid>
            );
        }
    };

    if (design === 'card') {
        return (<Card sx={{ minWidth: 0 }}>
            <CardContent>
                <Typography sx={{ fontSize: 16 }} color="text.primary" gutterBottom>
                    {header}
                </Typography>
                {renderContent()}
            </CardContent>
        </Card>)
    }
    else {
        return (
            <main>
                {renderContent()}
            </main>
        )
    };
}