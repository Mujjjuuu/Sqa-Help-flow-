import { Category } from '../types';
import { DEFAULT_TICKET_CATEGORIES } from '../config/ticketCategories';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { localDB } from './localStore';

export const categoryService = {
  async getCategories(projectId: string): Promise<Category[]> {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as Category[];
      }

      // If no categories exist yet for this project in Supabase, seed defaults
      if (!error && data && data.length === 0) {
        const toInsert = DEFAULT_TICKET_CATEGORIES.map((catName) => ({
          project_id: projectId,
          name: catName,
        }));
        const { data: inserted } = await supabase
          .from('categories')
          .insert(toInsert)
          .select();
        if (inserted) return inserted as Category[];
      }
    }

    return localDB.getCategories(projectId);
  },

  async createCategory(projectId: string, name: string): Promise<Category> {
    const trimmed = name.trim();
    const existing = await this.getCategories(projectId);
    const found = existing.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (found) return found;

    const newCategory: Category = {
      id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      project_id: projectId,
      name: trimmed,
      created_at: new Date().toISOString(),
    };

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          project_id: projectId,
          name: trimmed,
        })
        .select()
        .single();
      if (!error && data) return data as Category;
    }

    return localDB.saveCategory(newCategory);
  },
};
