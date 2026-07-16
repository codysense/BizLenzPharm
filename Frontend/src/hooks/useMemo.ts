// src/hooks/useMemos.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { memoApi } from '../lib/api';

export function useMemos(query?: any) {
  return useQuery({
    queryKey: ['memos', query],
    queryFn: () => memoApi.getMemos(query),
  });
}

export function useMemo(id: string) {
  return useQuery({
    queryKey: ['memo', id],
    queryFn: () => memoApi.getMemoById(id),
    enabled: !!id,
  });
}

export function useCreateMemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: memoApi.createMemo,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memos'] }),
  });
}

export function useUpdateMemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => memoApi.updateMemo(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memos'] }),
  });
}

export function usePostMemo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: memoApi.createMemo,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memos'] }),
  });
}

// export function useCancelMemo() {
//   const qc = useQueryClient();
//   return useMutation({
//     mutationFn: memoApi.,
//     onSuccess: () => qc.invalidateQueries({ queryKey: ['memos'] }),
//   });
// }
