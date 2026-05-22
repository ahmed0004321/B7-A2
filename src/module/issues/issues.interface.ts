export interface Iissues {
    reporter_id?: string;
    status?: "open" | "in_progress" | "resolved";
    title: string;
    description: string;
    type: "bug" | "feature_request";
}