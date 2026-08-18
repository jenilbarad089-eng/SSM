"""
SocietyHub v3.0 — Professional PowerPoint Generator
Run: python generate_ppt.py
Output: SocietyHub_Presentation.pptx
"""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt
import datetime

# ── Color Palette ────────────────────────────────────────────────────────────
NAVY      = RGBColor(0x0F, 0x17, 0x2A)   # dark navy bg
BLUE      = RGBColor(0x25, 0x6E, 0xFF)   # primary blue
ORANGE    = RGBColor(0xFF, 0x6B, 0x00)   # accent orange
WHITE     = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT     = RGBColor(0xF0, 0xF4, 0xFF)   # light bg
GRAY      = RGBColor(0x64, 0x74, 0x8B)   # muted gray
SUCCESS   = RGBColor(0x10, 0xB9, 0x81)   # green
WARN      = RGBColor(0xF5, 0x9E, 0x0B)   # yellow
DANGER    = RGBColor(0xEF, 0x44, 0x44)   # red
SLATE     = RGBColor(0x1E, 0x29, 0x3B)   # card bg

W = Inches(13.33)   # Widescreen 16:9
H = Inches(7.5)


# ── Helpers ───────────────────────────────────────────────────────────────────
def add_rect(slide, left, top, width, height, fill_color, opacity=None):
    shape = slide.shapes.add_shape(1, left, top, width, height)
    shape.line.fill.background()
    fill = shape.fill
    fill.solid()
    fill.fore_color.rgb = fill_color
    shape.line.color.rgb = fill_color
    return shape

def add_text(slide, text, left, top, width, height,
             font_size=16, bold=False, color=WHITE,
             align=PP_ALIGN.LEFT, wrap=True, italic=False):
    txb = slide.shapes.add_textbox(left, top, width, height)
    tf = txb.text_frame
    tf.word_wrap = wrap
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    run.font.size = Pt(font_size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = color
    run.font.name = "Segoe UI"
    return txb

def set_slide_bg(slide, color):
    background = slide.background
    fill = background.fill
    fill.solid()
    fill.fore_color.rgb = color

def add_pill_badge(slide, text, left, top, width, height, bg, fg=WHITE, size=11):
    add_rect(slide, left, top, width, height, bg)
    add_text(slide, text, left, top, width, height,
             font_size=size, bold=True, color=fg, align=PP_ALIGN.CENTER)

def h_line(slide, left, top, width, color=BLUE, thickness=Pt(1.5)):
    line = slide.shapes.add_connector(1, left, top, left+width, top)
    line.line.color.rgb = color
    line.line.width = thickness


# ── Slide Builders ────────────────────────────────────────────────────────────

def slide_01_title(prs):
    """Cover Slide"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_bg(slide, NAVY)

    # Left accent bar
    add_rect(slide, Inches(0), Inches(0), Inches(0.12), H, BLUE)

    # Orange gradient block bottom
    add_rect(slide, Inches(0), Inches(5.8), W, Inches(1.7), SLATE)

    # Main logo area top-left
    add_text(slide, "🏢", Inches(0.4), Inches(0.3), Inches(1.5), Inches(1.0), font_size=40)
    add_text(slide, "SocietyHub", Inches(1.7), Inches(0.35), Inches(6), Inches(0.8),
             font_size=42, bold=True, color=WHITE)
    add_text(slide, "v3.0  Enterprise Edition", Inches(1.7), Inches(1.0), Inches(6), Inches(0.5),
             font_size=16, color=RGBColor(0x93, 0xC5, 0xFD), italic=True)

    # Divider
    h_line(slide, Inches(0.4), Inches(1.65), Inches(12.5), ORANGE, Pt(2))

    # Title
    add_text(slide, "Residential Society Management", Inches(0.4), Inches(1.85), Inches(9), Inches(0.8),
             font_size=34, bold=True, color=WHITE)
    add_text(slide, "SaaS Platform — Project Presentation", Inches(0.4), Inches(2.6), Inches(9), Inches(0.6),
             font_size=22, color=RGBColor(0x93, 0xC5, 0xFD))

    # Stats row
    stats = [
        ("10", "Society Members"),
        ("8", "Admin Nav Tabs"),
        ("4", "User Roles"),
        ("100%", "Web-Based"),
    ]
    for i, (num, label) in enumerate(stats):
        x = Inches(0.4 + i * 3.2)
        add_rect(slide, x, Inches(3.7), Inches(2.8), Inches(1.4), SLATE)
        add_rect(slide, x, Inches(3.7), Inches(0.08), Inches(1.4), BLUE)
        add_text(slide, num, x + Inches(0.15), Inches(3.78), Inches(2.6), Inches(0.65),
                 font_size=32, bold=True, color=ORANGE)
        add_text(slide, label, x + Inches(0.15), Inches(4.35), Inches(2.6), Inches(0.4),
                 font_size=12, color=RGBColor(0x94, 0xA3, 0xB8))

    # Bottom bar info
    add_text(slide, "Jenil Barad  |  SocietyHub Grand Residency  |  Mumbai, Maharashtra",
             Inches(0.4), Inches(6.0), Inches(10), Inches(0.45),
             font_size=12, color=GRAY, italic=True)
    add_text(slide, f"Prepared: {datetime.date.today().strftime('%B %Y')}",
             Inches(0.4), Inches(6.5), Inches(10), Inches(0.4),
             font_size=11, color=GRAY)

    # Right visual
    add_rect(slide, Inches(9.8), Inches(0.2), Inches(3.3), Inches(5.3), SLATE)
    add_text(slide, "📊 Live Dashboard\n🔐 Role-Based Auth\n👥 10 Members\n🏢 3 Towers\n📋 Complaints\n💳 Billing\n📢 Notices\n🚗 Visitors",
             Inches(10.0), Inches(0.5), Inches(3.0), Inches(5.0),
             font_size=14, color=RGBColor(0x93, 0xC5, 0xFD))


def slide_02_agenda(prs):
    """Agenda Slide"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_bg(slide, RGBColor(0xF8, 0xFA, 0xFF))

    # Top bar
    add_rect(slide, Inches(0), Inches(0), W, Inches(1.3), NAVY)
    add_text(slide, "📋  Presentation Agenda", Inches(0.3), Inches(0.25), Inches(10), Inches(0.75),
             font_size=28, bold=True, color=WHITE)
    add_text(slide, "SocietyHub v3.0 — Complete Overview",
             Inches(9.5), Inches(0.4), Inches(3.5), Inches(0.5),
             font_size=11, color=GRAY, align=PP_ALIGN.RIGHT)

    agenda_items = [
        ("01", "Project Overview & Vision", "What SocietyHub solves and who it's for"),
        ("02", "Key Features & Modules", "8 major features across all 4 user roles"),
        ("03", "Technology Stack", "Frontend, Backend, Auth, Database layers"),
        ("04", "System Architecture", "How all components connect and communicate"),
        ("05", "User Roles & Access", "Admin, Resident, Committee, Security Guard"),
        ("06", "Member Directory", "All 10 society members with role assignments"),
        ("07", "Admin Dashboard", "8 navigation tabs and their data"),
        ("08", "Budget & Development Plan", "Timeline, costs, and deployment strategy"),
    ]

    cols = 2
    for i, (num, title, desc) in enumerate(agenda_items):
        col = i % cols
        row = i // cols
        x = Inches(0.4 + col * 6.4)
        y = Inches(1.5 + row * 1.4)
        add_rect(slide, x, y, Inches(6.0), Inches(1.2), WHITE)
        add_rect(slide, x, y, Inches(0.7), Inches(1.2), BLUE)
        add_text(slide, num, x + Inches(0.05), y + Inches(0.28), Inches(0.6), Inches(0.6),
                 font_size=18, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
        add_text(slide, title, x + Inches(0.8), y + Inches(0.1), Inches(5.0), Inches(0.45),
                 font_size=14, bold=True, color=NAVY)
        add_text(slide, desc, x + Inches(0.8), y + Inches(0.55), Inches(5.0), Inches(0.45),
                 font_size=11, color=GRAY)


def slide_03_overview(prs):
    """Project Overview"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_bg(slide, NAVY)

    add_rect(slide, Inches(0), Inches(0), W, Inches(1.3), SLATE)
    add_text(slide, "Project Overview & Vision", Inches(0.4), Inches(0.25), Inches(10), Inches(0.8),
             font_size=28, bold=True, color=WHITE)
    add_rect(slide, Inches(0), Inches(1.3), W, Inches(0.05), BLUE)

    add_text(slide, "What problem does SocietyHub solve?",
             Inches(0.4), Inches(1.5), Inches(12), Inches(0.5),
             font_size=18, bold=True, color=ORANGE)

    problems = [
        "❌ Manual paper-based maintenance billing and tracking",
        "❌ No centralized complaint management for 100+ residents",
        "❌ Visitor entry managed on physical registers at gate",
        "❌ No digital notice board for society announcements",
        "❌ No role-based portal for admin, residents, and security",
    ]
    for i, p in enumerate(problems):
        add_text(slide, p, Inches(0.5), Inches(2.1 + i * 0.45), Inches(6.0), Inches(0.4),
                 font_size=12, color=RGBColor(0xFC, 0xA5, 0xA5))

    add_text(slide, "SocietyHub Solution ✅",
             Inches(6.8), Inches(1.5), Inches(6), Inches(0.5),
             font_size=18, bold=True, color=SUCCESS)

    solutions = [
        "✅ Cloud-based SaaS — works on any device, any browser",
        "✅ 4 dedicated portals: Admin, Resident, Committee, Guard",
        "✅ Digital billing with payment tracking and receipts",
        "✅ Real-time complaint lifecycle management",
        "✅ Smart gate pass approval via resident notification",
    ]
    for i, s in enumerate(solutions):
        add_text(slide, s, Inches(6.8), Inches(2.1 + i * 0.45), Inches(6.2), Inches(0.4),
                 font_size=12, color=RGBColor(0x6E, 0xE7, 0xB7))

    # Bottom tagline
    add_rect(slide, Inches(0.4), Inches(5.5), Inches(12.5), Inches(0.9), BLUE)
    add_text(slide, '"Digitizing Residential Society Management — End to End"',
             Inches(0.6), Inches(5.6), Inches(12), Inches(0.7),
             font_size=16, bold=True, italic=True, color=WHITE, align=PP_ALIGN.CENTER)


def slide_04_features(prs):
    """Key Features"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_bg(slide, RGBColor(0xF8, 0xFA, 0xFF))

    add_rect(slide, Inches(0), Inches(0), W, Inches(1.3), NAVY)
    add_text(slide, "Key Features & Modules", Inches(0.4), Inches(0.25), Inches(10), Inches(0.8),
             font_size=28, bold=True, color=WHITE)

    features = [
        ("🔐", "Role-Based Auth",    "4 portals: Admin, Resident,\nCommittee, Guard",     BLUE),
        ("💳", "Billing & Dues",     "Monthly maintenance invoices,\npayment tracking",    SUCCESS),
        ("📋", "Complaint Mgmt",     "Ticket lifecycle: Pending →\nIn Progress → Resolved",ORANGE),
        ("📢", "Notice Board",       "Digital announcements, AGM\nalerts, emergency news", WARN),
        ("🚗", "Gate Visitors",      "Gate pass generation, entry/\nexit log, QR codes",   DANGER),
        ("🗳️", "Society Polls",      "Online voting for solar panels,\nEV chargers etc.",  RGBColor(0x8B,0x5C,0xF6)),
        ("📅", "Amenity Booking",    "Community hall, gym, lawn,\npool reservation system",RGBColor(0x06,0xB6,0xD4)),
        ("📊", "Admin Dashboard",    "Real-time KPIs, charts,\naudit logs, user control", RGBColor(0xEC,0x48,0x99)),
    ]

    for i, (icon, title, desc, color) in enumerate(features):
        col = i % 4
        row = i // 4
        x = Inches(0.3 + col * 3.25)
        y = Inches(1.5 + row * 2.7)
        add_rect(slide, x, y, Inches(3.0), Inches(2.4), WHITE)
        add_rect(slide, x, y, Inches(3.0), Inches(0.08), color)
        add_text(slide, icon,  x + Inches(0.1), y + Inches(0.15), Inches(0.7), Inches(0.7), font_size=24)
        add_text(slide, title, x + Inches(0.1), y + Inches(0.75), Inches(2.8), Inches(0.45),
                 font_size=13, bold=True, color=NAVY)
        add_text(slide, desc,  x + Inches(0.1), y + Inches(1.15), Inches(2.8), Inches(0.9),
                 font_size=10.5, color=GRAY, wrap=True)


def slide_05_tech_stack(prs):
    """Technology Stack"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_bg(slide, NAVY)

    add_rect(slide, Inches(0), Inches(0), W, Inches(1.3), SLATE)
    add_text(slide, "Technology Stack", Inches(0.4), Inches(0.25), Inches(10), Inches(0.8),
             font_size=28, bold=True, color=WHITE)

    layers = [
        ("🖥️  Frontend", [
            "HTML5 + Vanilla CSS (no framework bloat)",
            "Bootstrap 5.3 — responsive grid & components",
            "Font Awesome 6 — icons throughout UI",
            "Chart.js — KPI charts in admin dashboard",
            "Google Fonts (Inter) — premium typography",
        ], BLUE),
        ("⚙️  Backend", [
            "Node.js + Express.js — REST API server",
            "Firebase Authentication — email/password + Google",
            "bcrypt.js — server-side password hashing",
            "JWT tokens — session management",
            "CORS + Helmet — security middleware",
        ], ORANGE),
        ("🗄️  Data Layer", [
            "LocalStorage SystemDB — offline-first engine",
            "seed.json — structured initial dataset",
            "Version-based cache busting (v3.1)",
            "Auto-merge for new seed schema",
            "CSV export for audit logs",
        ], SUCCESS),
        ("🚀  Deployment", [
            "Vercel — zero-config static + serverless",
            "GitHub — version control & CI/CD",
            "Progressive Web App (PWA) — installable",
            "HTTPS enforced — SSL/TLS by default",
            "Vercel URL: societyhub11.vercel.app",
        ], WARN),
    ]

    for i, (title, items, color) in enumerate(layers):
        col = i % 2
        row = i // 2
        x = Inches(0.3 + col * 6.5)
        y = Inches(1.45 + row * 2.75)
        add_rect(slide, x, y, Inches(6.2), Inches(2.55), SLATE)
        add_rect(slide, x, y, Inches(6.2), Inches(0.42), color)
        add_text(slide, title, x + Inches(0.15), y + Inches(0.05), Inches(5.8), Inches(0.35),
                 font_size=14, bold=True, color=WHITE)
        for j, item in enumerate(items):
            add_text(slide, f"  • {item}", x + Inches(0.15),
                     y + Inches(0.5 + j * 0.38), Inches(5.9), Inches(0.38),
                     font_size=10.5, color=RGBColor(0xCB, 0xD5, 0xE1))


def slide_06_architecture(prs):
    """System Architecture"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_bg(slide, RGBColor(0xF8, 0xFA, 0xFF))

    add_rect(slide, Inches(0), Inches(0), W, Inches(1.3), NAVY)
    add_text(slide, "System Architecture", Inches(0.4), Inches(0.25), Inches(10), Inches(0.8),
             font_size=28, bold=True, color=WHITE)

    # Three-tier diagram
    tiers = [
        ("Presentation Layer", ["index.html (Landing)", "login.html (Auth)", "admin.html (Dashboard)",
                                 "resident.html", "committee.html", "guard.html"], BLUE),
        ("Logic / API Layer",  ["firebase-auth.js", "db.js (SystemDB)", "admin.js", "resident.js",
                                 "committee.js", "notifications.js"], ORANGE),
        ("Data Layer",         ["seed.json (Master Data)", "LocalStorage (Client DB)",
                                 "Firebase Auth (Server)", "Audit Logs", "Session Storage"], SUCCESS),
    ]

    for i, (title, items, color) in enumerate(tiers):
        x = Inches(0.3 + i * 4.3)
        add_rect(slide, x, Inches(1.5), Inches(4.0), Inches(5.5), WHITE)
        add_rect(slide, x, Inches(1.5), Inches(4.0), Inches(0.5), color)
        add_text(slide, title, x + Inches(0.1), Inches(1.55), Inches(3.8), Inches(0.4),
                 font_size=13, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
        for j, item in enumerate(items):
            add_rect(slide, x + Inches(0.2), Inches(2.15 + j * 0.75), Inches(3.6), Inches(0.6),
                     RGBColor(0xF1, 0xF5, 0xF9))
            add_text(slide, item, x + Inches(0.3), Inches(2.2 + j * 0.75), Inches(3.4), Inches(0.5),
                     font_size=11, color=NAVY, bold=(j == 0))

        if i < 2:
            add_text(slide, "→", Inches(4.1 + i * 4.3), Inches(4.1), Inches(0.4), Inches(0.4),
                     font_size=22, bold=True, color=ORANGE, align=PP_ALIGN.CENTER)


def slide_07_roles(prs):
    """User Roles"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_bg(slide, NAVY)

    add_rect(slide, Inches(0), Inches(0), W, Inches(1.3), SLATE)
    add_text(slide, "User Roles & Access Portals", Inches(0.4), Inches(0.25), Inches(10), Inches(0.8),
             font_size=28, bold=True, color=WHITE)

    roles = [
        ("🛡️ Admin",           DANGER,  "Jenil Barad",
         ["Full system control", "Approve/reject members", "Manage billing & notices",
          "View all complaints", "Role & access settings", "Audit log access"]),
        ("👥 Committee",        RGBColor(0x06,0xB6,0xD4), "Suresh Kumar\nRohan Mehta",
         ["Create polls & vote", "Post society notices", "View billing summary",
          "Attend AGM digitally", "Amenity management", "Residents view"]),
        ("🏠 Resident",         BLUE,   "5 Members\n(Owners & Tenants)",
         ["Pay maintenance online", "Submit complaints", "Approve visitor entry",
          "Book amenities", "Vote in polls", "View notices"]),
        ("🚦 Security Guard",  WARN,   "Bahadur Singh\nVikram Yadav",
         ["Register visitors", "Issue gate passes", "Log entry/exit times",
          "Approve/deny entry", "View resident list", "Shift dashboard"]),
    ]

    for i, (role, color, who, perms) in enumerate(roles):
        x = Inches(0.25 + i * 3.27)
        add_rect(slide, x, Inches(1.4), Inches(3.05), Inches(5.9), SLATE)
        add_rect(slide, x, Inches(1.4), Inches(3.05), Inches(0.6), color)
        add_text(slide, role, x + Inches(0.1), Inches(1.45), Inches(2.85), Inches(0.5),
                 font_size=14, bold=True, color=WHITE)
        add_text(slide, who, x + Inches(0.1), Inches(2.1), Inches(2.85), Inches(0.55),
                 font_size=10, color=RGBColor(0x93, 0xC5, 0xFD), italic=True)
        h_line(slide, x + Inches(0.1), Inches(2.68), Inches(2.7),
               RGBColor(0x33, 0x44, 0x55), Pt(0.75))
        for j, perm in enumerate(perms):
            add_text(slide, f"✓  {perm}", x + Inches(0.1),
                     Inches(2.8 + j * 0.7), Inches(2.85), Inches(0.6),
                     font_size=10.5, color=RGBColor(0xCB, 0xD5, 0xE1))


def slide_08_members(prs):
    """All 10 Members"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_bg(slide, RGBColor(0xF8, 0xFA, 0xFF))

    add_rect(slide, Inches(0), Inches(0), W, Inches(1.3), NAVY)
    add_text(slide, "Society Members Directory — All 10 Members",
             Inches(0.4), Inches(0.25), Inches(12), Inches(0.8),
             font_size=26, bold=True, color=WHITE)

    members = [
        ("Jenil Barad",     "Admin",           "A-101", "Tower A", DANGER),
        ("Suresh Kumar",    "Committee Member", "A-402", "Tower A", RGBColor(0x06,0xB6,0xD4)),
        ("Rohan Mehta",     "Committee Member", "B-301", "Tower B", RGBColor(0x06,0xB6,0xD4)),
        ("Amit Patel",      "Resident (Owner)", "A-302", "Tower A", BLUE),
        ("Priya Verma",     "Resident (Tenant)","C-501", "Tower C", BLUE),
        ("Rahul Sharma",    "Resident (Owner)", "B-104", "Tower B", BLUE),
        ("Neha Gupta",      "Resident (Tenant)","B-202", "Tower B", BLUE),
        ("Ananya Deshmukh", "Resident (Owner)", "A-604", "Tower A", BLUE),
        ("Bahadur Singh",   "Security Guard",   "Gate 1","Morning",  WARN),
        ("Vikram Yadav",    "Security Guard",   "Gate 2","Evening",  WARN),
    ]

    headers = ["#", "Member Name", "Role", "Flat / Gate", "Tower / Shift"]
    col_widths = [0.4, 3.0, 3.0, 2.0, 2.2]
    col_x = [0.3]
    for w in col_widths[:-1]:
        col_x.append(col_x[-1] + w)

    row_h = 0.52
    header_y = 1.4

    # Header
    add_rect(slide, Inches(0.3), Inches(header_y), Inches(12.6), Inches(0.5), NAVY)
    for j, (header, cx, cw) in enumerate(zip(headers, col_x, col_widths)):
        add_text(slide, header, Inches(cx + 0.05), Inches(header_y + 0.07),
                 Inches(cw), Inches(0.36), font_size=11, bold=True,
                 color=WHITE, align=PP_ALIGN.LEFT)

    # Rows
    for i, (name, role, flat, tower, color) in enumerate(members):
        y = header_y + 0.5 + i * row_h
        row_bg = RGBColor(0xF1, 0xF5, 0xF9) if i % 2 == 0 else WHITE
        add_rect(slide, Inches(0.3), Inches(y), Inches(12.6), Inches(row_h - 0.02), row_bg)
        # Color left accent
        add_rect(slide, Inches(0.3), Inches(y), Inches(0.06), Inches(row_h - 0.02), color)

        row_data = [str(i+1), name, role, flat, tower]
        for j, (val, cx, cw) in enumerate(zip(row_data, col_x, col_widths)):
            txt_color = NAVY if j != 2 else NAVY
            bold = j == 1
            add_text(slide, val, Inches(cx + 0.1), Inches(y + 0.1),
                     Inches(cw - 0.1), Inches(row_h - 0.15),
                     font_size=10.5, color=txt_color, bold=bold)


def slide_09_admin_tabs(prs):
    """Admin Dashboard Tabs"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_bg(slide, NAVY)

    add_rect(slide, Inches(0), Inches(0), W, Inches(1.3), SLATE)
    add_text(slide, "Admin Dashboard — 8 Navigation Tabs",
             Inches(0.4), Inches(0.25), Inches(12), Inches(0.8),
             font_size=28, bold=True, color=WHITE)

    tabs = [
        ("01", "Overview Dashboard", "Live KPIs: Total residents, maintenance collection rate,\npending complaints, active visitors. Monthly bar chart\nand complaint doughnut resolution matrix.", BLUE),
        ("02", "Member Directory",   "All 10 members with avatar, role, flat/gate, email,\nphone, status. Actions: Allot Flat, Change Role, Remove.\nSorted: Admin → Committee → Resident → Guard.",ORANGE),
        ("03", "Complaint Tickets",  "5 active complaints from real member flats.\nCategory, priority, status badges. Admin can update\nstatus and add resolution notes via modal.", SUCCESS),
        ("04", "Maintenance Billing","8 invoices (July + June 2026) for all resident flats.\nInvoice ID, amount, due date, TXN ID, receipt number.\nPaid vs Unpaid tracking with visual badges.", WARN),
        ("05", "Notice Publisher",   "4 active notices including AGM, tank cleaning,\nFoundation Day celebration, parking enforcement.\nPost new notice via broadcast modal.", RGBColor(0x06,0xB6,0xD4)),
        ("06", "Gate Visitors Log",  "5 visitor entries with gate pass codes. Shows\nvisitor name, purpose, entry/exit time, flat, and\nresident approval status.", DANGER),
        ("07", "Role & Access Ctrl", "All 10 members with full profile: photo, phone,\nmove-in date, shift, salary/dues, parking slot.\nGrant/Revoke Admin, Change Role, Allot Flat.", RGBColor(0x8B,0x5C,0xF6)),
        ("08", "Audit Trail Logs",   "6 immutable system logs: login events, payments,\ncomplaints filed, notices published, gate passes.\nExport to CSV functionality.", RGBColor(0xEC,0x48,0x99)),
    ]

    for i, (num, title, desc, color) in enumerate(tabs):
        col = i % 2
        row = i // 2
        x = Inches(0.25 + col * 6.55)
        y = Inches(1.45 + row * 1.5)
        add_rect(slide, x, y, Inches(6.3), Inches(1.38), SLATE)
        add_rect(slide, x, y, Inches(0.55), Inches(1.38), color)
        add_text(slide, num, x + Inches(0.05), y + Inches(0.38), Inches(0.45), Inches(0.55),
                 font_size=14, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
        add_text(slide, title, x + Inches(0.68), y + Inches(0.08), Inches(5.4), Inches(0.38),
                 font_size=13, bold=True, color=WHITE)
        add_text(slide, desc, x + Inches(0.68), y + Inches(0.46), Inches(5.4), Inches(0.82),
                 font_size=9.5, color=RGBColor(0x94, 0xA3, 0xB8), wrap=True)


def slide_10_budget(prs):
    """Budget & Development Plan"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_bg(slide, RGBColor(0xF8, 0xFA, 0xFF))

    add_rect(slide, Inches(0), Inches(0), W, Inches(1.3), NAVY)
    add_text(slide, "Budget & Development Plan",
             Inches(0.4), Inches(0.25), Inches(12), Inches(0.8),
             font_size=28, bold=True, color=WHITE)

    # Left: Phase timeline
    phases = [
        ("Phase 1", "Week 1–2",  "Foundation",         "HTML structure, auth system, seed data, responsive navbar", BLUE),
        ("Phase 2", "Week 3–4",  "Core Modules",        "Resident portal, billing, complaints, notice board",       ORANGE),
        ("Phase 3", "Week 5–6",  "Admin Dashboard",     "8-tab admin panel, KPIs, charts, audit logs, approvals",   SUCCESS),
        ("Phase 4", "Week 7",    "Guard & Committee",   "Gate pass system, polls, amenity booking portal",          WARN),
        ("Phase 5", "Week 8",    "Polish & Deploy",     "Notifications, PWA, SEO, Vercel deployment, testing",      DANGER),
    ]

    add_text(slide, "📅 Development Timeline", Inches(0.3), Inches(1.4), Inches(6.3), Inches(0.4),
             font_size=14, bold=True, color=NAVY)

    for i, (phase, weeks, title, desc, color) in enumerate(phases):
        y = Inches(1.85 + i * 1.05)
        add_rect(slide, Inches(0.3), y, Inches(6.3), Inches(0.95), WHITE)
        add_rect(slide, Inches(0.3), y, Inches(0.08), Inches(0.95), color)
        add_text(slide, phase, Inches(0.45), y + Inches(0.08), Inches(1.2), Inches(0.35),
                 font_size=11, bold=True, color=color)
        add_text(slide, weeks, Inches(0.45), y + Inches(0.45), Inches(1.3), Inches(0.3),
                 font_size=9, color=GRAY, italic=True)
        add_text(slide, title, Inches(1.6), y + Inches(0.08), Inches(4.8), Inches(0.35),
                 font_size=12, bold=True, color=NAVY)
        add_text(slide, desc, Inches(1.6), y + Inches(0.45), Inches(4.8), Inches(0.4),
                 font_size=9.5, color=GRAY, wrap=True)

    # Right: Budget table
    add_text(slide, "💰 Budget Breakdown (INR)", Inches(7.0), Inches(1.4), Inches(5.9), Inches(0.4),
             font_size=14, bold=True, color=NAVY)

    budget_items = [
        ("Frontend Development",    "₹ 25,000",  BLUE),
        ("Backend API (Node.js)",   "₹ 30,000",  ORANGE),
        ("Firebase Auth Setup",     "₹ 8,000",   SUCCESS),
        ("UI/UX Design & CSS",      "₹ 15,000",  RGBColor(0x8B,0x5C,0xF6)),
        ("PWA & Notifications",     "₹ 10,000",  WARN),
        ("Testing & QA",            "₹ 8,000",   GRAY),
        ("Vercel Deployment",       "₹ 0",       SUCCESS),
        ("Domain Name (1 Year)",    "₹ 1,500",   NAVY),
        ("Documentation",           "₹ 4,000",   GRAY),
        ("Contingency (10%)",       "₹ 10,150",  DANGER),
    ]

    header_y = 1.85
    add_rect(slide, Inches(7.0), Inches(header_y), Inches(5.9), Inches(0.42), NAVY)
    add_text(slide, "Item", Inches(7.1), Inches(header_y + 0.07), Inches(3.8), Inches(0.3),
             font_size=11, bold=True, color=WHITE)
    add_text(slide, "Cost", Inches(10.8), Inches(header_y + 0.07), Inches(1.8), Inches(0.3),
             font_size=11, bold=True, color=WHITE, align=PP_ALIGN.RIGHT)

    for i, (item, cost, color) in enumerate(budget_items):
        y = Inches(header_y + 0.42 + i * 0.48)
        row_bg = RGBColor(0xF1, 0xF5, 0xF9) if i % 2 == 0 else WHITE
        add_rect(slide, Inches(7.0), y, Inches(5.9), Inches(0.46), row_bg)
        add_rect(slide, Inches(7.0), y, Inches(0.06), Inches(0.46), color)
        add_text(slide, item, Inches(7.1), y + Inches(0.08), Inches(3.7), Inches(0.3),
                 font_size=10, color=NAVY)
        add_text(slide, cost, Inches(10.5), y + Inches(0.08), Inches(2.2), Inches(0.3),
                 font_size=10, bold=True, color=color, align=PP_ALIGN.RIGHT)

    # Total
    total_y = Inches(header_y + 0.42 + len(budget_items) * 0.48 + 0.05)
    add_rect(slide, Inches(7.0), total_y, Inches(5.9), Inches(0.52), NAVY)
    add_text(slide, "TOTAL PROJECT COST", Inches(7.1), total_y + Inches(0.1),
             Inches(3.5), Inches(0.35), font_size=12, bold=True, color=WHITE)
    add_text(slide, "₹ 1,11,650", Inches(10.3), total_y + Inches(0.1),
             Inches(2.4), Inches(0.35), font_size=14, bold=True,
             color=ORANGE, align=PP_ALIGN.RIGHT)


def slide_11_closing(prs):
    """Closing Slide"""
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_bg(slide, NAVY)

    add_rect(slide, Inches(0), Inches(0), Inches(0.12), H, ORANGE)

    add_text(slide, "🏢", Inches(4.5), Inches(0.5), Inches(4.0), Inches(1.2), font_size=56,
             align=PP_ALIGN.CENTER)

    add_text(slide, "SocietyHub v3.0", Inches(0.5), Inches(1.8), Inches(12.3), Inches(0.8),
             font_size=44, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    add_text(slide, "Enterprise Residential Society Management Platform",
             Inches(0.5), Inches(2.55), Inches(12.3), Inches(0.5),
             font_size=18, color=RGBColor(0x93,0xC5,0xFD), italic=True, align=PP_ALIGN.CENTER)

    h_line(slide, Inches(2.0), Inches(3.15), Inches(9.3), ORANGE, Pt(2))

    info_items = [
        ("🌐 Live URL",     "https://societyhub11.vercel.app"),
        ("📁 GitHub",       "github.com/jenilbarad089-eng/SSM"),
        ("👤 Developer",    "Jenil Barad  |  jenilbarad089@gmail.com"),
        ("📍 Location",     "SocietyHub Grand Residency, Mumbai, MH — SOC-MH-4001"),
    ]

    for i, (label, value) in enumerate(info_items):
        y = Inches(3.4 + i * 0.72)
        add_text(slide, label, Inches(2.5), y, Inches(2.5), Inches(0.55),
                 font_size=13, bold=True, color=ORANGE)
        add_text(slide, value, Inches(5.0), y, Inches(7.5), Inches(0.55),
                 font_size=13, color=RGBColor(0xCB,0xD5,0xE1))

    add_rect(slide, Inches(3.5), Inches(6.5), Inches(6.3), Inches(0.7), BLUE)
    add_text(slide, "Thank You  🙏  Questions Welcome",
             Inches(3.5), Inches(6.55), Inches(6.3), Inches(0.6),
             font_size=16, bold=True, color=WHITE, align=PP_ALIGN.CENTER)


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    prs = Presentation()
    prs.slide_width  = W
    prs.slide_height = H

    print("Building SocietyHub PPT...")
    slide_01_title(prs);      print("  [OK] Slide 01 - Title / Cover")
    slide_02_agenda(prs);     print("  [OK] Slide 02 - Agenda")
    slide_03_overview(prs);   print("  [OK] Slide 03 - Project Overview")
    slide_04_features(prs);   print("  [OK] Slide 04 - Key Features")
    slide_05_tech_stack(prs); print("  [OK] Slide 05 - Tech Stack")
    slide_06_architecture(prs); print("  [OK] Slide 06 - Architecture")
    slide_07_roles(prs);      print("  [OK] Slide 07 - User Roles")
    slide_08_members(prs);    print("  [OK] Slide 08 - Members Directory")
    slide_09_admin_tabs(prs); print("  [OK] Slide 09 - Admin Dashboard Tabs")
    slide_10_budget(prs);     print("  [OK] Slide 10 - Budget & Dev Plan")
    slide_11_closing(prs);    print("  [OK] Slide 11 - Closing")

    output = r"d:\SSM\SocietyHub_Presentation.pptx"
    prs.save(output)
    print("\nDONE! Saved: " + output)
    print("Slides: " + str(len(prs.slides)) + " | Size: 16:9 Widescreen")

if __name__ == "__main__":
    main()

