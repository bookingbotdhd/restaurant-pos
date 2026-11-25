"use client";

import type {
  ActivateLicenceDto,
  IssueLicenceDto,
  LicenceIssued,
  LicenceSummary,
} from "@restroos/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type { LicenceSummary, LicenceIssued };

export function useLicenceStatus() {
  return useQuery({
    queryKey: ["licence", "status"],
    queryFn: () => api.get<{ active: LicenceSummary | null }>("/licence/status"),
  });
}

export function useIssuedLicences() {
  return useQuery({
    queryKey: ["licence", "issued"],
    queryFn: () => api.get<LicenceSummary[]>("/licence"),
  });
}

function invalidateLicence(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["licence"] });
}

export function useIssueLicence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: IssueLicenceDto) => api.post<LicenceIssued>("/licence/issue", dto),
    onSuccess: () => invalidateLicence(queryClient),
  });
}

export function useActivateLicence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: ActivateLicenceDto) => api.post<LicenceSummary>("/licence/activate", dto),
    onSuccess: () => invalidateLicence(queryClient),
  });
}

export function useDeactivateLicence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ ok: true }>("/licence/deactivate", {}),
    onSuccess: () => invalidateLicence(queryClient),
  });
}

export function useRevokeLicence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<{ ok: true }>(`/licence/${id}/revoke`, {}),
    onSuccess: () => invalidateLicence(queryClient),
  });
}
