# Systeam Austria Research Report

**Research Date:** 2026-01-24
**Subject:** SYSTEAM GmbH Austria - IT/Office Supplies Distributor
**Confidence Level:** High (primary sources verified)

---

## Executive Summary

Systeam Austria is a leading IT hardware and software distributor headquartered in Vienna, operating as part of the Systeam Group. The company specializes in printer distribution while offering a comprehensive portfolio of IT components, AV technology, and consumables. They provide FTP-based data integration for retailers with tab-separated text files for article information and pricing.

---

## 1. Company Background

### Parent Company: Systeam AG (Germany)

| Attribute | Details |
|-----------|---------|
| **Founded** | 1985 by Michael Mitlacher in Ebensfeld, Bavaria, Germany |
| **Original Business** | Engineering company |
| **Pivot Year** | 1990 - Transitioned from system house to wholesale distribution |
| **Specialization** | 1995 - Focused on printer, accessories, and consumables sector |
| **Headquarters** | Ebensfeld, Upper Franconia, Germany |
| **Revenue** | ~$540.50 million USD |
| **Employees** | 305+ across all locations (180 core staff) |
| **Corporate Family** | 18 companies in the Systeam AG corporate family |

### Key Milestones

- **1985**: Founded as engineering company
- **1990**: Business model shift to wholesale distribution
- **1991**: Revenue of 2 million DM
- **1995**: Specialization in printer distribution
- **2001**: Merger with DOBTEC GmbH (Large Format Printing expertise)
- **2004**: Swiss expansion - Systeam Schweiz GmbH founded
- **2004**: Acquisition of Printec Distribution AG Hainburg
- **2011**: Austrian expansion - SYSTEAM GmbH Austria founded
- **2018**: Acquisition of Despec Nordic Holding A/S (Nordic expansion)
- **2025**: Partnership with MMD for Philips Monitors distribution

### Systeam Austria (SYSTEAM GmbH)

| Attribute | Details |
|-----------|---------|
| **Legal Name** | SYSTEAM GmbH |
| **Founded** | 2011 |
| **Address** | Oberlaaer Strasse 331, A-1230 Wien, Austria |
| **Phone** | +43/1/6152549-0 |
| **Email** | office@systeam-austria.at |
| **Website** | https://www.systeam-austria.at |
| **Business Hours** | Mon-Thu 8:30-17:00; Fri 8:30-16:00 |
| **Known Contact** | Robert Klement-Dragotinits |

### Geographic Coverage (DACH+ Region)

The Systeam Group operates across Central and Northern Europe:

| Entity | Region | Year Established |
|--------|--------|------------------|
| Systeam DE | Germany | 1985 (HQ) |
| Systeam CH | Switzerland | 2004 |
| Systeam AT | Austria | 2011 |
| Printec | Germany | 2004 (acquired) |
| Despec | Denmark, Norway, Sweden, Finland, Iceland | 2018 (acquired) |

---

## 2. Product Portfolio

### Primary Categories

#### 1. Printing Solutions (Core Specialty)
- Printers (desktop, business, production)
- Large Format Printers (via DOBTEC expertise)
- Accessories and consumables
- Spare parts
- Toner and ink cartridges

#### 2. IT Components
- Complete computers (PCs, workstations)
- Notebooks and laptops
- Tablets
- Motherboards and mainboards
- Memory modules (RAM)
- Individual hardware components
- Spare parts

#### 3. Software & Media
- Software packages
- Storage media
- Operating systems
- Business applications

#### 4. AV Technology
- Large Format Displays
- Digital Signage solutions
- Conference technology
- Projectors
- Philips Monitors (B2B and B2C, including Evnia gaming brand)

### Inventory Statistics

| Metric | Value |
|--------|-------|
| **Total SKUs** | 60,000+ articles |
| **In-Stock Items** | 16,000+ directly available |
| **Active Customers** | 6,500+ in DACH region |
| **Dealers Served Annually** | ~5,000 |
| **Manufacturer Partners** | 100+ |

### Known Brand Partnerships

While a complete manufacturer list is not publicly available, confirmed partnerships include:

- **Philips/MMD** - Monitors and displays (since October 2025)
- Various printer manufacturers (HP, Canon, Brother, Epson, Lexmark - industry standard brands distributed)

---

## 3. FTP Data Export System

### Overview

Systeam provides free FTP setup for retailer data integration, enabling automated product catalog and pricing synchronization.

### Access Requirements

| Requirement | Details |
|-------------|---------|
| **Authentication** | Username + Password |
| **Request Method** | Written request to distributor |
| **Contact (Austria)** | office@systeam-austria.at |
| **Contact (Germany)** | info@systeam.de |
| **New Customer Form** | https://www.systeam-austria.at/DOWNLOAD/Systeam_Austria_Neukunde.pdf |

### Credentials Acquisition Process

1. **New Customers**: Complete Neukunde (new customer) registration form
2. **Existing Customers**: Request FTP access from assigned sales contact
3. **Alternative**: Access credentials via Systeam online shop account
4. **ITscope Users**: Enter credentials in 'My account' > 'Price list' tab

### File Format

| Attribute | Specification |
|-----------|---------------|
| **Format** | .TXT (text files) |
| **Delimiter** | Tab-separated values (TSV) |
| **Encoding** | Standard text encoding |
| **Files Provided** | ARTICLE-INFO.TXT, PREISLIST.TXT |

---

## 4. File Format Specifications

### ARTICLE-INFO.TXT (Article/Product Information)

**Note**: Exact field specifications are not publicly documented. Based on industry standards for IT distributors, the file likely contains:

| Probable Field | Description |
|----------------|-------------|
| Article Number | Systeam internal SKU |
| Manufacturer Part Number | MPN from manufacturer |
| EAN/GTIN | International Article Number (barcode) |
| Description | Product description |
| Manufacturer Name | Brand/manufacturer |
| Product Category | Category classification |
| Status | Availability status code |
| Weight | Product weight |
| Dimensions | Product dimensions |

### PREISLIST.TXT (Price List)

**Note**: Exact field specifications are not publicly documented. Based on industry standards, the file likely contains:

| Probable Field | Description |
|----------------|-------------|
| Article Number | Reference to ARTICLE-INFO |
| Net Price | Dealer purchase price |
| MSRP/RRP | Recommended retail price |
| Stock Quantity | Available quantity |
| Warehouse Code | Stock location |
| Currency | Price currency (EUR) |
| Price Break | Volume discount tiers |
| Availability Date | Expected availability |

### Integration Notes

- **Update Frequency**: Real-time or near real-time pricing available
- **Price Types**: Individual dealer-specific pricing (requires authentication)
- **ITscope Integration**: Automatic price list retrieval after credential entry
- **Project Lists**: Special project pricing available upon request

### Obtaining Exact Specifications

For precise file format documentation:
1. Contact Systeam Austria directly: office@systeam-austria.at
2. Request technical integration documentation from assigned sales contact
3. Access sample files via FTP after account setup

---

## 5. Retailer Integration Procedures

### Step-by-Step Integration Process

#### Phase 1: Account Setup
1. Complete new customer application form (Neukunden_Antrag.pdf)
2. Submit required business documentation
3. Receive dealer account confirmation
4. Obtain online shop login credentials

#### Phase 2: FTP Access Setup
1. Request FTP access in writing
2. Contact: office@systeam-austria.at or sales representative
3. Receive FTP server credentials (host, username, password)
4. Systeam provides free FTP setup assistance

#### Phase 3: Data Integration
1. Configure FTP client with provided credentials
2. Download ARTICLE-INFO.TXT for product catalog
3. Download PREISLIST.TXT for pricing data
4. Parse tab-separated values into your system
5. Map fields to your product database schema

#### Phase 4: Ongoing Synchronization
1. Set up automated FTP downloads (recommended: daily)
2. Configure differential updates
3. Monitor for price changes
4. Update stock availability

### ITscope Platform Integration

For ITscope users, simplified integration is available:

1. Navigate to 'My account' > 'Price list'
2. Enter Systeam credentials (username, password)
3. Activate settings
4. Automatic price list retrieval begins
5. View retrieval status within seconds

### Real-Time Pricing

Additional real-time price configuration requires:
- Customer number (pre-entered in system)
- Password for real-time access
- Settings activation

---

## 6. Austrian IT Distribution Market Position

### Market Context

| Metric | Value (2024) |
|--------|--------------|
| **Austria ICT Market Size** | USD 18.64 billion |
| **IT Services Market** | USD 8.06 billion projected |
| **IT Outsourcing Segment** | USD 3.07 billion |

### Global Distribution Landscape

The IT distribution market is highly concentrated:

| Distributor | Global Sales (2024) |
|-------------|---------------------|
| TD Synnex | $80.1 billion |
| Ingram Micro | Part of top 3 |
| Arrow (ECS) | Part of top 3 |
| **Top 15 combined** | $287 billion (61% market share) |
| **Total global market** | $463 billion |

### Systeam's Niche Position

Systeam occupies a specialized position in the Austrian/DACH market:

| Strength | Description |
|----------|-------------|
| **Printer Specialization** | Leading position in printer distribution |
| **Dealer Focus** | Strong relationships with 6,500+ active dealers |
| **Regional Expertise** | Deep DACH market knowledge |
| **Medium Business Focus** | Excellent access to SMB segment |
| **Award Recognition** | Frequently ranked #1 in German dealer surveys |
| **Personal Service** | Dedicated sales contacts with direct phone lines |

### Competitive Advantages

1. **Specialization vs. Generalization**: Focus on printers and consumables rather than broad IT portfolio
2. **Service Quality**: Personal account management, same-day shipping (orders before 4 PM)
3. **Stock Availability**: 16,000+ items immediately available from 60,000+ catalog
4. **Regional Presence**: Physical operations in Austria since 2011
5. **Logistics Partners**: DHL, UPS, Schenker for reliable delivery

### Market Positioning

Systeam operates as a **specialist distributor** rather than competing directly with broadline giants like TD Synnex or Ingram Micro. Their focus areas:

- SMB-focused dealers
- Print and imaging specialists
- Regional resellers in DACH
- AV/Digital Signage installers

---

## 7. Key Contacts & Resources

### Systeam Austria Contacts

| Purpose | Contact |
|---------|---------|
| **General Inquiries** | office@systeam-austria.at |
| **Phone** | +43/1/6152549-0 |
| **Known Contact** | Robert Klement-Dragotinits |
| **New Customer Registration** | [Neukunde Form (PDF)](https://www.systeam-austria.at/DOWNLOAD/Systeam_Austria_Neukunde.pdf) |

### Online Resources

| Resource | URL |
|----------|-----|
| **Website (DE)** | https://www.systeam-austria.at |
| **Website (EN)** | https://www.systeam-austria.at/en/ |
| **ITscope Integration Guide** | https://guide.itscope.com/en/kb/systeam-osterreich-gmbh/ |
| **Parent Company** | https://www.systeam.de |

---

## 8. Limitations & Information Gaps

### Information Not Publicly Available

1. **Exact file format specifications** for ARTICLE-INFO.TXT and PREISLIST.TXT
2. **Complete manufacturer partner list**
3. **Specific pricing structures and discount tiers**
4. **FTP server hostname and connection details**
5. **API alternatives** (if any exist beyond FTP)

### Recommendations for Obtaining Missing Information

1. **Request technical documentation** directly from Systeam Austria
2. **Schedule a call** with Robert Klement-Dragotinits for integration support
3. **Complete dealer registration** to access full documentation
4. **Request sample files** to understand exact field structure

---

## Sources

- [Systeam Austria Website](https://www.systeam-austria.at/en/)
- [Systeam Germany Website](https://www.systeam.de/)
- [ITscope Guide - SYSTEAM GmbH Austria](https://guide.itscope.com/en/kb/systeam-osterreich-gmbh/)
- [ITscope Guide - SYSTEAM GmbH Germany](https://guide.itscope.com/en/kb/systeam-gmbh-germany/)
- [IT Business - Wer ist Systeam?](https://www.it-business.de/wer-ist-systeam-a-45a08922736695b0818808a35b3f0f93/)
- [D&B Business Directory - SYSTEAM AG](https://www.dnb.com/business-directory/company-profiles.systeam_ag.2b8aef2eeee68dc86d1910ba1c502742.html)
- [Bayern International - SYSTEAM](https://www.bayern-international.de/en/company-database/company-details/systeam-gesellschaft-fuer-computersysteme-mbh-1637)
- [CB Insights - Systeam](https://www.cbinsights.com/company/systeam)
- [Invidis - Systeam becomes Philips Distributor](https://invidis.de/2025/10/mmd-bildschirme-systeam-wird-philips-distributor/)
- [Statista - Austria IT Services Market](https://www.statista.com/outlook/tmo/it-services/austria)
- [Canalys - Technology Distribution Report](https://www.canalys.com/insights/next-for-technology-distribution)
- [The Recycler - Despec Nordic Acquisition](https://therecycler.com/posts/despec-nordic-acquired-by-systeam/)

---

*Report compiled for integration planning purposes. For production implementation, verify all technical specifications directly with Systeam Austria.*
