import { Column, DataRow } from "@/interfaces";
import { Button, GridLegacy as Grid, Switch, TextField, Typography } from "@mui/material";
import { useForm, Controller } from "react-hook-form"
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import JSONEditor from "@/components/Editors/JSONEditor";
import StylePicker from "../AutoComplete/StylePicker";
import { useEffect } from "react";
import KeyValuePairEditor from "../Editors/KeyValuePairEditor";
import { KeyValuePair } from "@/shared/interfaces/dtos";

interface DynamicFormProps {
    row: DataRow;
    columns: Column[];
    index: number;
    handleEditChange: (value: string | KeyValuePair[], index: number, field: keyof DataRow) => void;
    handleSave: (index: number) => void;
    triggerValidation?: number;
    handleCancel?: () => void;
    onValidityChange?: (isValid: boolean, index: number) => void;
    saveOnBlur?: boolean;
}

const generateFormSchema = (columns: Column[]) => {
    const schemaObject: Record<string, any> = {};

    columns.forEach(column => {
        let fieldSchema;

        if (column.validation) {
            switch (column.validation.type) {
                case 'string':
                    fieldSchema = z.string().min(1, column.validation.message);
                    break;
                case 'number':
                    fieldSchema = z.number({ invalid_type_error: column.validation.message });
                    break;
                case 'email':
                    fieldSchema = z.string().email(column.validation.message);
                    break;
                case 'url':
                    fieldSchema = z.string().url(column.validation.message);
                    break;
                case 'type':
                    fieldSchema = z.string().regex(/^.+\/.+$/, column.validation.message);
                    break;
                case 'object':
                    fieldSchema = z.object({
                        id: z.string().min(1, "ID krävs").refine((id) => id !== 'default', { message: column.validation.message }),
                    }).refine((data) => data.id !== column.defaultValue, { message: column.validation.message });
                    break;
                case 'json':
                    fieldSchema = z.string().refine((data) => {
                        try {
                            JSON.parse(data);
                            return true;
                        } catch {
                            return false;
                        }
                    }, { message: column.validation.message || "Måste vara en giltig JSON-sträng" });
                    break;
                default:
                    fieldSchema = z.string();
            }

            if (column.validation.required === false) {
                fieldSchema = fieldSchema.optional().or(z.literal(''));
            }
            schemaObject[column.field] = fieldSchema;
        }
    });

    return z.object(schemaObject);
};
export const DynamicForm = ({ row, handleEditChange, handleSave, handleCancel, index, columns, onValidityChange, saveOnBlur, triggerValidation }: DynamicFormProps) => {
    const formSchema = generateFormSchema(columns);
    type FormValues = z.infer<typeof formSchema>;
    const { control, handleSubmit, formState: { errors, isValid }, trigger } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: row as FormValues
    });

    useEffect(() => {
        if (triggerValidation !== undefined) {
            trigger();
        }
    }, [triggerValidation, trigger]);

    {
        onValidityChange &&
            useEffect(() => {
                onValidityChange(isValid, index);
            }, [isValid, index, onValidityChange]);
    }

    const textfields = columns.filter(column => (column.inputType === 'textfield' || column.inputType === 'stylepicker')
        && row.hasOwnProperty(column.field));
    const textareas = columns.filter(column => column.inputType === 'textarea' && row.hasOwnProperty(column.field));
    const checkboxes = columns.filter(column => column.inputType === 'checkbox' && row.hasOwnProperty(column.field));
    const jsons = columns.filter(column => column.inputType === 'json' && row.hasOwnProperty(column.field));
    const keyvaluepairs = columns.filter(column => column.inputType === 'keyvaluepair' && row.hasOwnProperty(column.field));

    const distributeFields = (fields: any) => {
        const fieldsPerColumn = Math.ceil(fields.length / 2);
        const firstColumn = fields.slice(0, fieldsPerColumn);
        const secondColumn = fields.slice(fieldsPerColumn, fieldsPerColumn * 2);
        return [firstColumn, secondColumn];
    };

    const [firstColumnTextfields, secondColumnTextfields] = distributeFields(textfields);
    const [firstColumnCheckboxes, secondColumnCheckboxes] = distributeFields(checkboxes);
    const [firstColumnTextareas, secondColumnTextareas] = distributeFields(textareas);
    const [firstColumnKeyValuePairs, secondColumnKeyValuePairs] = distributeFields(keyvaluepairs);
    const [firstColumnJsons, secondColumnJsons] = distributeFields(jsons);

    const renderColumn = (textfields: any, textareas: any, jsons: any, keyvaluepair: any) => (
        <>
            {textfields.map((field: any) => renderTextField(field.field, row[field.field], index, field.inputType))}
            {textareas.map((field: any) => renderTextField(field.field, row[field.field], index, field.inputType))}
            {keyvaluepair.map((field: any) => renderTextField(field.field, row[field.field], index, field.inputType))}
            {jsons.map((field: any) => renderTextField(field.field, row[field.field], index, field.inputType))}
        </>
    );

    const handleBlur = () => {
        if (saveOnBlur)
            handleSubmit(onSubmit)();
    };
    const onSubmit = (data: FormValues) => {
        handleSave(index);
    };

    const getColumn = (key: string) => {
        return columns.find(column => column.field === key);
    }
    const renderTextField = (key: any, value: any, index: any, inputType: any) => {
        let valueToUse;
        switch (inputType) {
            case 'textfield':
            case 'textarea':
                valueToUse = value;
                break;
            case 'checkbox':
                valueToUse = value || false;
                break;
            default:
                valueToUse = value;
        }

        let column = getColumn(key)!;
        let validation = column.validation || { required: false, type: 'string', message: '' };
        let header = column.headerName || key;
        const commonPart = (
            <Typography variant="subtitle2">{header}</Typography>
        );
        let inputField;
        switch (inputType) {
            case 'textfield':
                inputField = (
                    <Controller
                        name={column.field}
                        control={control}
                        render={({ field, fieldState: { error } }) => {
                            return (
                                <TextField
                                    {...field}
                                    fullWidth
                                    error={!!error}
                                    helperText={error ? validation.message : null}
                                    disabled={column.readOnly}
                                    onBlur={handleBlur}
                                    onChange={(e) => {
                                        field.onChange(e);
                                        handleEditChange(e.target.value, index, column.field);
                                    }}
                                    margin="normal"
                                />
                            )
                        }}
                    />

                );
                break;
            case 'checkbox':
                inputField = (
                    <Controller
                        name={column.field}
                        control={control}
                        render={({ field: { onChange, value, name, ref } }) => (
                            <Switch
                                checked={value === "true" || value === true}
                                onChange={(e) => {
                                    onChange(e.target.checked);
                                    handleEditChange(e.target.checked.toString(), index, column.field);
                                }}
                                name={name}
                                onBlur={handleBlur}
                                inputRef={ref}
                                disabled={column.readOnly}
                            />
                        )}
                    />
                );
                break;
            case 'stylepicker':
                inputField = (
                    <Controller
                        name={column.field}
                        control={control}
                        render={({ field, fieldState: { error } }) => {
                            return (
                                <StylePicker
                                    value={field.value}
                                    error={!!error}
                                    onBlur={handleBlur}
                                    helperText={error ? validation.message : null}
                                    onChange={(newValue) => {
                                        field.onChange(newValue);
                                        handleEditChange(newValue, index, column.field);
                                    }}
                                />
                            )
                        }}
                    />
                );
                break;
            case 'textarea':
                inputField = (
                    <Controller
                        name={column.field}
                        control={control}
                        render={({ field, fieldState: { error } }) => (
                            <TextField
                                {...field}
                                multiline
                                minRows={4}
                                fullWidth
                                onBlur={handleBlur}
                                error={!!error}
                                helperText={error ? validation.message : null}
                                disabled={column.readOnly}
                                onChange={(e) => {
                                    field.onChange(e);
                                    handleEditChange(e.target.value, index, column.field);
                                }}
                                margin="normal"
                            />
                        )}
                    />
                );
                break;
            case 'json':
                inputField = (
                    <JSONEditor value={JSON.parse(value)} onBlur={handleBlur} onChange={(newValue) => handleEditChange(JSON.stringify(newValue), index, key)} />
                );
                break;
            case 'keyvaluepair':
                inputField = (
                    <KeyValuePairEditor
                        value={value || []}
                        onChange={(newPairs) => handleEditChange(newPairs, index, key)}
                        onBlur={handleBlur}
                    />
                );
                break;
            default:
                inputField = <div>Okänd inputType: {inputType}</div>;
        }

        return (
            <Grid item xs={12} key={key}>
                {commonPart}
                {inputField}
            </Grid>
        );
    };

    return (
        <>
            <form onSubmit={handleSubmit(onSubmit)}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        {renderColumn(firstColumnTextfields, [], [], [])}
                    </Grid>
                    <Grid item xs={12} md={6}>
                        {renderColumn(secondColumnTextfields, [], [], [])}
                    </Grid>
                </Grid>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        {renderColumn([], firstColumnCheckboxes, [], [])}
                    </Grid>
                    <Grid item xs={12} md={6}>
                        {renderColumn([], secondColumnCheckboxes, [], [])}
                    </Grid>
                </Grid>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        {renderColumn([], firstColumnTextareas, [], [])}
                    </Grid>
                    <Grid item xs={12} md={6}>
                        {renderColumn([], secondColumnTextareas, [], [])}
                    </Grid>
                </Grid>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        {renderColumn([], [], [], firstColumnKeyValuePairs)}
                    </Grid>
                    <Grid item xs={12} md={6}>
                        {renderColumn([], [], [], secondColumnKeyValuePairs)}
                    </Grid>
                </Grid>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        {renderColumn([], [], firstColumnJsons, [])}
                    </Grid>
                    <Grid item xs={12} md={6}>
                        {renderColumn([], [], secondColumnJsons, [])}
                    </Grid>
                </Grid>
                {!saveOnBlur && <Button type="submit" style={{ float: 'right', margin: 10 }}>
                    Spara
                </Button>}
                {handleCancel && <Button onClick={() => handleCancel()} style={{ float: 'right', margin: 10 }}>
                    Avbryt
                </Button>}
            </form>
        </>
    );
};