import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import {
    ChevronLeft,
    ChevronLeftIcon,
    ChevronRightIcon,
    ExternalLinkIcon,
    SearchIcon,
    XIcon,
} from "lucide-react";
import BodyLayout from "@/components/body-layout";
import { ToolBar, ToolBarButtonLabel, ToolBarLink } from "@/components/toolbar";
import { pb } from "@/lib/pb";
import dayjs from "dayjs";
import { twMerge } from "tailwind-merge";

export default function Home() {
    return <BodyLayout>Hello</BodyLayout>;
}
