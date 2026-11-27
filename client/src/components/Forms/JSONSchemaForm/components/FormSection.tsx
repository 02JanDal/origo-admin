import React from 'react';
import {
  GridLegacy as Grid,
  Paper,
  Box,
  Typography,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';

interface FormSectionProps {
  title: string;
  description?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}

// Renders a form section - either as a collapsible accordion or static paper
export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  collapsible = false,
  defaultCollapsed = false,
  children,
}) => {
  // Collapsible accordion section
  if (collapsible) {
    return (
      <Grid item xs={12}>
        <Accordion
          defaultExpanded={!defaultCollapsed}
          sx={{ mb: 2, borderRadius: 2, '&:before': { display: 'none' } }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              bgcolor: 'grey.50',
              borderRadius: 2,
              '&.Mui-expanded': {
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
              }
            }}
          >
            <Box>
              <Typography variant="h6" component="h3">
                {title}
              </Typography>
              {description && (
                <Typography variant="body2" color="text.secondary">
                  {description}
                </Typography>
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 3 }}>
            {children}
          </AccordionDetails>
        </Accordion>
      </Grid>
    );
  }

  // Static paper section
  return (
    <Grid item xs={12}>
      <Paper elevation={1} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" component="h3" gutterBottom>
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {description}
            </Typography>
          )}
          <Divider />
        </Box>
        {children}
      </Paper>
    </Grid>
  );
};

