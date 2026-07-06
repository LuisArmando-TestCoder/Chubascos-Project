// Shared types for the poem-book PDF pipeline.

export interface BookPoem {
  title: string;
  content: string;
}

export interface BookInput {
  authorName: string;
  bio?: string;
  contacts?: { label: string; url: string }[];
  poems: BookPoem[];
  profileUrl: string;
  // Optional overrides
  bookTitle?: string;
  copyrightHolder?: string;
  year?: number;
}

// A single laid-out text line ready to be drawn.
export interface LaidLine {
  text: string;
  // Vertical offset from the top of the content box, in points.
  y: number;
  // Whether this line begins a new stanza (used only for spacing decisions).
  isStanzaStart?: boolean;
}

// One rendered page of flowing content (bio or a poem body).
export interface ContentPage {
  lines: LaidLine[];
}

// The fully paginated body of one poem.
export interface PoemLayout {
  title: string;
  // Absolute 1-based page number of this poem's dedicated title page.
  titlePageNumber: number;
  // Content pages that follow the title page.
  pages: ContentPage[];
  // Index of the poem (0-based) for numbering "01", "02"…
  index: number;
}

// A single entry in the printed table of contents.
export interface TocEntry {
  title: string;
  pageNumber: number; // points at the poem's title page
}

// The complete computed layout of the whole book.
export interface BookLayout {
  bookTitle: string;
  authorName: string;
  copyrightHolder: string;
  year: number;
  profileUrl: string;
  bio?: string;
  contacts?: { label: string; url: string }[];

  // Page counts / offsets for each front-matter section.
  coverPages: number; // always 1
  copyrightPages: number; // always 1
  bioPages: ContentPage[]; // may be empty
  tocPages: number;
  tocEntries: TocEntry[];

  poems: PoemLayout[];

  qrPageNumber: number; // absolute 1-based page number of the final QR page
  totalPages: number;
}
