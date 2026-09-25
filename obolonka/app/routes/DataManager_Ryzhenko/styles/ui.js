export const ui = {
  layout: {
    page: "min-h-screen bg-neutral-100 p-6 text-neutral-800",
    appShell:
      "mx-auto max-w-7xl overflow-hidden rounded-[28px] border-4 border-black bg-white shadow-2xl",
    header: "border-b border-neutral-200 bg-neutral-50 px-8 py-5",
    section: "p-8",
    contentPanel:
      "rounded-[28px] border-4 border-sky-200 bg-sky-50/40 p-6 shadow-inner",
  },

  text: {
    pageTitle: "text-2xl font-semibold tracking-tight",
    sectionTitle: "text-xl font-semibold",
    muted: "text-sm text-neutral-500",
    label:
      "mb-2 block text-xs font-medium uppercase tracking-wide text-neutral-500",
    infoText: "text-sm text-neutral-500",
    infoStrong: "font-semibold text-neutral-800",
  },

  dropdown: {
    wrapper: "relative min-w-[260px]",
    userWrapper: "relative",
    trigger:
      "flex w-full items-center justify-between rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-medium shadow-sm transition hover:bg-neutral-100",
    userTrigger:
      "flex w-[260px] items-center justify-between rounded-2xl border border-neutral-300 bg-white px-3 py-2 shadow-sm transition hover:bg-neutral-100",
    menu:
      "absolute left-0 top-[110%] z-10 w-full rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl",
    userMenu:
      "absolute left-0 top-[110%] z-10 w-[260px] rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl",
    menuItem:
      "w-full rounded-xl px-3 py-2 text-left text-sm transition hover:bg-neutral-100",
    menuItemDanger:
      "w-full rounded-xl px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50",
    chevron: "text-neutral-400",
  },

  user: {
    avatar:
      "flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200 text-sm font-semibold",
    triggerContent: "flex items-center gap-3",
    userText: "text-left",
    userName: "text-sm font-medium",
    userRole: "text-xs text-neutral-500",
  },

  search: {
    outer:
      "px-8 pt-6",
    panel:
      "rounded-[24px] border-2 border-orange-400 bg-orange-50 px-5 py-4 shadow-sm",
    row: "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between",
    inputWrap:
      "flex items-center gap-3 rounded-2xl border border-orange-200 bg-white px-4 py-3",
    input: "w-full bg-transparent text-sm outline-none",
    icon: "text-lg",
  },

  button: {
    primary:
      "rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-black",
    secondary:
      "rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-medium shadow-sm transition hover:bg-neutral-100",
    small:
      "rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm transition hover:bg-neutral-100",
    tiny:
      "rounded-lg border border-neutral-300 px-3 py-1.5 text-xs transition hover:bg-neutral-100",
    subtle:
      "rounded-xl bg-neutral-100 px-3 py-1 text-xs text-neutral-500 transition hover:bg-neutral-200",
  },

    table: {
    wrapper:
      "overflow-hidden rounded-[22px] border border-neutral-200 bg-white shadow-sm",
    scroll: "overflow-x-auto",
    table: "w-full min-w-max text-left text-sm",
    thead: "bg-neutral-100 text-neutral-600",
    th: "whitespace-nowrap px-5 py-4 font-semibold",
    tr: "border-t border-neutral-100 transition hover:bg-neutral-50",
    td: "max-w-[280px] truncate px-5 py-4",
    tdMuted: "max-w-[280px] truncate px-5 py-4 text-neutral-500",
    tdStrong: "whitespace-nowrap px-5 py-4 font-medium",
    tdActions: "whitespace-nowrap px-5 py-4",
    badge:
      "rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700",
    actions: "flex whitespace-nowrap gap-2",
  },

  cards: {
    grid: "mt-5 grid gap-4 md:grid-cols-2",
    card: "rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm",
    label: "text-sm text-neutral-500",
    value: "mt-1 text-lg font-semibold",
  },

  misc: {
    topRow:
      "mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between",
    currentModeRow: "mb-4 flex items-center justify-between",
    controls: "flex gap-2",
  },
};