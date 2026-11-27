import React from 'react';
import { GridLegacy as Grid, Box } from '@mui/material';
import { ExtendedJSONSchema } from '@/shared/interfaces/jsonSchema.interface';
import { FieldGroup } from '../utils/fieldGrouper';
import { getGroupFieldSize } from '../utils/fieldGrouper';

interface FieldGroupProps {
  group: FieldGroup;
  renderField: (
    fieldName: string,
    fieldSchema: ExtendedJSONSchema,
    groupType: FieldGroup['type'],
    fieldsInGroup: number
  ) => React.ReactNode;
  groupIndex: number;
  sectionIndex: number;
}

// Renders a group of fields based on layout type (inline/row/single)
export const FieldGroupComponent: React.FC<FieldGroupProps> = ({
  group,
  renderField,
  groupIndex,
  sectionIndex,
}) => {
  const groupKey = `group-${sectionIndex}-${groupIndex}`;

  // Inline layout - small fields (like checkboxes) in a horizontal row
  if (group.type === 'inline') {
    return (
      <Grid item xs={12} key={groupKey}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            alignItems: 'center',
            mt: 1,
            p: 2,
            backgroundColor: 'grey.50',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'grey.200',
          }}
        >
          {group.fields.map(([fieldName, fieldSchema]) => (
            <Box key={fieldName} sx={{ minWidth: 'fit-content' }}>
              {renderField(
                fieldName,
                fieldSchema as ExtendedJSONSchema,
                group.type,
                group.fields.length
              )}
            </Box>
          ))}
        </Box>
      </Grid>
    );
  }

  // Row layout - multiple fields in a styled container with grid columns
  if (group.type === 'row' && group.fields.length > 1) {
    return (
      <Grid item xs={12} key={groupKey}>
        <Box
          sx={{
            p: 2,
            backgroundColor: 'grey.25',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'grey.100',
          }}
        >
          <Grid container spacing={2}>
            {group.fields.map(([fieldName, fieldSchema]) => {
              const fieldSize = getGroupFieldSize(
                fieldSchema as ExtendedJSONSchema,
                group.type,
                group.fields.length
              );

              return (
                <Grid item xs={12} md={fieldSize} key={fieldName}>
                  {renderField(
                    fieldName,
                    fieldSchema as ExtendedJSONSchema,
                    group.type,
                    group.fields.length
                  )}
                </Grid>
              );
            })}
          </Grid>
        </Box>
      </Grid>
    );
  }

  // Single fields - default grid layout based on field type
  return (
    <>
      {group.fields.map(([fieldName, fieldSchema]) => {
        const fieldSize = getGroupFieldSize(
          fieldSchema as ExtendedJSONSchema,
          group.type,
          group.fields.length
        );

        return (
          <Grid item xs={12} md={fieldSize} key={fieldName}>
            {renderField(
              fieldName,
              fieldSchema as ExtendedJSONSchema,
              group.type,
              group.fields.length
            )}
          </Grid>
        );
      })}
    </>
  );
};

