// Real OCR output of the two portal screenshots (old and new timetable), as the
// in-browser Tesseract read them. Used by the re-scan tests.
// OLD table (10 courses) — OCR output
export const OLD = [
  "Your Registered Courses                                                                                                                Print Schedule",
  "Section      Course Code Title                                               Credit Hrs Instructor                         Schedule",
  "032610354  CSC452          COMPILER CONSTRUCTION                              2              MR. BASHARAT SAGHEER KAYANI ~~ TUE 01:15 03:20 LR26",
  "032610355  CSC452L         COMPILER CONSTRUCTION LAB                        1              TBA                                   THU 11:41 02:45 COMP LAB2",
  "032610366  CSC332          ADVANCE DATABASE MANAGEMENT SYSTEMS         2              MS. TAYYABA SHEHZAD               FRI 01:15 03:20 LR26",
  "032610367  CSC332L         ADVANCE DATABASE MANAGEMENT SYSTEMS LAB 1              TBA                                   TUE 08:00 11:05 COMP LAB4",
  "032610380 CMC381         ARTIFICAL INTELLIGENCE                                3              MS. SAMAVIA TARIQ                  WED 09:35 11:05 LR33, FRI 04:25 05:55 LR29",
  "032610375 CMC381L        ARTIFICAL INTELLIGENCE LAB                           1               MS. FAIZA ALI                         THU 02:50 05:55 COMP LAB13",
  "032610390 CSC382           HCl & COMPUTER GRAPHICS                            2               MS. RAMOONA LATIF                 WED 11:10 01:14 LR26",
  "032610396  CSC312         WEB ENGINEERING                                  2             DR. FAHEEM SHAUKAT              MON 12:41 02:45 LR42",
  "032610395  CSC312L        WEB ENGINEERING LAB                               1              DR. FAHEEM SHAUKAT               THU 08:00 11:05 COMP LABS",
  "032610399  CSC467          INTERNET OF THINGS                                   3              MS. SEHER SAEED                     MON 11:10 12:40 LR29, FRI 08:00 09:30 LR26",
  "Courses: 10 Total Credit Hours: 18",
].join("\n");

// NEW table, exactly as the browser OCR read it: the AI row's code and section
// number came out as "D) oc 10500  CcM(C381", and its last room as "@".
export const NEW = [
  "032610354     CSC452            COMPILER CONSTRUCTION                                  2                MR. OMAID GHAYYUR            TUE 01:15 03:20 LR26",
  "032610353    CSc452L         COMPILER CONSTRUCTION LAB                         1              MR. HAFIZ SOHAIL AHMAD     MON 11:10 02:15 COMP LAB2",
  "032610366    CSC332          ADVANCE DATABASE MANAGEMENT SYSTEMS          2               MS. TAYYABA SHEHZAD         FRI 01:15 03:20 LR26",
  "032610365    CSC332L         ADVANCE DATABASE MANAGEMENT SYSTEMS LAB     1              MS. TAYYABA SHEHZAD         MON 08:31 10:05 COMP LAB4",
  "D) oc 10500    CcM(C381         ARTIFICAL INTELLIGENCE                                3              DR. SANA MUJEEB              WED 09:35 11:05 LR33, FRI 04:25 05:55 @",
  "032610390    CSC382          HCI & COMPUTER GRAPHICS                            2              MS. ROMANA ALI               WED 11:10 01:14 LR26",
  "032610394    Csc312          WEB ENGINEERING                                      2              DR. FAHEEM SHAUKAT          MON 03:51 05:55 LR27",
  "032610397    csc312L         WEB ENGINEERING LAB                                 1              DR. FAHEEM SHAUKAT          THU 11:41 02:45 COMP LAB4",
  "032610349    CSC467           INTERNET OF THINGS                                      3               DR. SYED IRFAN SOHAIL         WED 02:50 04:20 LR33, THU 02:50 04:20 LR27",
].join("\n");
