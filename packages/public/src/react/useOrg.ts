import { useEffect, useRef, useState } from "react";
import Sayr, { Organization } from "../index";

export function useOrg(slug?: string) {
    const [data, setData] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mountedRef = useRef(true);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (!slug) return;

        setLoading(true);
        setError(null);

        Sayr.org.get(slug).then((res) => {
            if (!mountedRef.current) return;

            if (!res.success) {
                setError(res.error);
                setData(null);
            } else {
                setData(res.data);
            }

            setLoading(false);
        });
    }, [slug]);

    return {
        data,
        loading,
        error,
    };
}