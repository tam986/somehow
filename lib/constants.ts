import { Host, Shift } from "@/types";

export const INITIAL_HOSTS: Host[] = [
    { id: '1', name: "Y BÌNH", phone: "", group: 'A', color: "#2E7D32", bgColor: "#C8E6C9", note: "Ca1:+9.5M" },
    { id: '2', name: "KHÁNH QUỲNH", phone: "", group: 'A', color: "#1B5E20", bgColor: "#A5D6A7", note: "Ca1:+4.0M" },
    { id: '3', name: "MAI LAN", phone: "", group: 'A', color: "#0D47A1", bgColor: "#BBDEFB", note: "Ca4:+2.5M" },
    { id: '4', name: "THANH THÙY", phone: "", group: 'A', color: "#4A148C", bgColor: "#E1BEE7", note: "Ca1:+2.6M" },
    { id: '5', name: "GIAO LYN", phone: "", group: 'B', color: "#E65100", bgColor: "#FFE0B2", note: "Ca1:+3.5M" },
    { id: '6', name: "MINH TÂM", phone: "", group: 'B', color: "#880E4F", bgColor: "#F8BBD0", note: "Ca1:+2.2M" },
    { id: '7', name: "THƯƠNG THƯƠNG", phone: "", group: 'B', color: "#006064", bgColor: "#B2EBF2", note: "Ca2:+1.3M" },
    { id: '8', name: "THU THẢO", phone: "", group: 'B', color: "#4E342E", bgColor: "#D7CCC8", note: "Ca2:+1.7M" },
    { id: '9', name: "HẢI NGỌC", phone: "", group: 'B', color: "#1A237E", bgColor: "#C5CAE9", note: "Ca1:+0.9M" },
    { id: '10', name: "KIM NGÂN", phone: "", group: 'C', color: "#BF360C", bgColor: "#FFCCBC", note: "Ca3:+1.7M" },
    { id: '11', name: "GIA HÂN", phone: "", group: 'C', color: "#33691E", bgColor: "#DCEDC8", note: "Ca2:+1.2M" },
    { id: '12', name: "BẢO KHANH", phone: "", group: 'C', color: "#757575", bgColor: "#E0E0E0", note: "Thấp nhất" },
];

export const SHIFTS: Shift[] = [
    { id: 0, name: "Ca 1", time: "7-10h", isBest: true },
    { id: 1, name: "Ca 2", time: "10-13h" },
    { id: 2, name: "Ca 3", time: "13-16h" },
    { id: 3, name: "Ca 4", time: "16-19h" },
    { id: 4, name: "Ca 5", time: "19-22h" },
    { id: 5, name: "Ca 6", time: "22-1h", isNight: true },
];

export const OPERATIONAL_COST = 80000000; // 80 triệu
export const DAY_NAMES = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
