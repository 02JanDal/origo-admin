'use client';;
import { use } from "react";
import { useRouter } from "next/navigation";
import { LinkResourceService as service } from '@/api';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import LinkResourceForm from '@/views/sources/LinkResourceView';
import { LinkResourceDto } from "@/shared/interfaces/dtos";
import { useApp } from "@/contexts/AppContext";

export default function EditPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);

    const {
        id
    } = params;

    const router = useRouter();
    const { showToastAfterNavigation, showToast } = useApp();
    const queryKey = 'linkResource';
    const { data: existingData, isLoading: existingDataLoading, error: existingDataError } =
        useQuery({ queryKey: [queryKey], queryFn: () => service.fetchAll() });

    const queryClient = useQueryClient();

    const { data, isLoading, error } = useQuery({
        queryKey: [queryKey, id],
        queryFn: () => service.fetch(id)
    });

    const handleUpdateClick = async (linkResource: LinkResourceDto) => {
        try {
            await service.update(id, linkResource);
            queryClient.invalidateQueries({ queryKey: [queryKey] });
            showToastAfterNavigation('Ändringarna har sparats', 'success');
            router.back();
        } catch (error) {
            showToast('Ett fel uppstod vid sparande av länkresurs', 'error');
            console.error(`[${new Date().toISOString()}] Error updating link resource: ${error}`);
        }
    };

    const handleCancelClick = () => {
        router.back();
    };

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>An error occurred: {error.message}</div>;

    return (
        (data && <LinkResourceForm
            existingData={existingData}
            initialData={data}
            onSubmit={handleUpdateClick}
            onCancel={handleCancelClick}
            submitButtonText="Uppdatera"
            title="Uppdatera Länkresurs"
        />)
    );
}