import { useEffect, useState } from "react";
import Sayr, { Organization } from "../index";

export function useOrg(slug?: string) {
    const [data, setData] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<unknown>(null);

    useEffect(() => {
        if (!slug) return;

        setLoading(true);
        Sayr.org
            .get(slug)
            .then(setData)
            .catch(setError)
            .finally(() => setLoading(false));
    }, [slug]);

    return { data, loading, error };
}