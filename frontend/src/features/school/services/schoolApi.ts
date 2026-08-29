/** College structure API calls (departments, courses, sections, orgs, AY, semesters). */
import { apiClient } from "@/api/client";
import type {
  AcademicYear,
  Course,
  Department,
  Organization,
  Section,
  Semester,
  SchoolListResponse,
} from "@/features/school/types";

function listEndpoint<T>(endpoint: string) {
  return async (params: Record<string, unknown> = {}): Promise<{
    data: T[];
    meta?: SchoolListResponse<T>["meta"];
  }> => {
    const { data } = await apiClient.get<SchoolListResponse<T>>(endpoint, { params });
    return { data: data.data, meta: data.meta };
  };
}

export const schoolApi = {
  // Departments
  listDepartments: listEndpoint<Department>("/school/departments"),
  createDepartment: (p: Partial<Department>) =>
    apiClient.post<SchoolListResponse<Department>>("/school/departments", p).then((r) => r.data.data),
  updateDepartment: (id: string, p: Partial<Department>) =>
    apiClient.patch<SchoolListResponse<Department>>(`/school/departments/${id}`, p).then((r) => r.data.data),
  deleteDepartment: (id: string) => apiClient.delete(`/school/departments/${id}`),

  // Courses
  listCourses: listEndpoint<Course>("/school/courses"),
  createCourse: (p: Partial<Course>) =>
    apiClient.post<SchoolListResponse<Course>>("/school/courses", p).then((r) => r.data.data),
  updateCourse: (id: string, p: Partial<Course>) =>
    apiClient.patch<SchoolListResponse<Course>>(`/school/courses/${id}`, p).then((r) => r.data.data),
  deleteCourse: (id: string) => apiClient.delete(`/school/courses/${id}`),

  // Sections
  listSections: listEndpoint<Section>("/school/sections"),
  createSection: (p: Partial<Section>) =>
    apiClient.post<SchoolListResponse<Section>>("/school/sections", p).then((r) => r.data.data),
  updateSection: (id: string, p: Partial<Section>) =>
    apiClient.patch<SchoolListResponse<Section>>(`/school/sections/${id}`, p).then((r) => r.data.data),
  deleteSection: (id: string) => apiClient.delete(`/school/sections/${id}`),

  // Organizations
  listOrganizations: listEndpoint<Organization>("/school/organizations"),
  createOrganization: (p: Partial<Organization>) =>
    apiClient.post<SchoolListResponse<Organization>>("/school/organizations", p).then((r) => r.data.data),
  updateOrganization: (id: string, p: Partial<Organization>) =>
    apiClient.patch<SchoolListResponse<Organization>>(`/school/organizations/${id}`, p).then((r) => r.data.data),
  deleteOrganization: (id: string) => apiClient.delete(`/school/organizations/${id}`),

  // Academic Years
  listAcademicYears: listEndpoint<AcademicYear>("/school/academic-years"),
  createAcademicYear: (p: Partial<AcademicYear>) =>
    apiClient.post<SchoolListResponse<AcademicYear>>("/school/academic-years", p).then((r) => r.data.data),
  updateAcademicYear: (id: string, p: Partial<AcademicYear>) =>
    apiClient.patch<SchoolListResponse<AcademicYear>>(`/school/academic-years/${id}`, p).then((r) => r.data.data),
  deleteAcademicYear: (id: string) => apiClient.delete(`/school/academic-years/${id}`),

  // Semesters
  listSemesters: listEndpoint<Semester>("/school/semesters"),
  createSemester: (p: Partial<Semester>) =>
    apiClient.post<SchoolListResponse<Semester>>("/school/semesters", p).then((r) => r.data.data),
  updateSemester: (id: string, p: Partial<Semester>) =>
    apiClient.patch<SchoolListResponse<Semester>>(`/school/semesters/${id}`, p).then((r) => r.data.data),
  deleteSemester: (id: string) => apiClient.delete(`/school/semesters/${id}`),
};
