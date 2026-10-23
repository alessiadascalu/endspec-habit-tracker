Habit Tracker - Task 2

1. Cum se ruleaza aplicatia
Backend-ul (Fastify si SQLite): Intri in folderul backend, rulezi npm install si apoi npx tsx src/server.ts. Merge pe portul 3001.
Frontend-ul (Next.js): Intri in folderul frontend, rulezi npm install si apoi npm run dev. Merge pe portul 3000.
Testul de replay: Din folderul backend, rulezi npx tsx src/replay.ts.


2. Dovezi ca functioneaza
Scriptul de test injecteaza cu succes toate cele 68 de cereri din inregistrare direct in server. Trece 100% din teste (68 din 68). Frontend-ul se leaga perfect la API, iar bara de XP si statusul se actualizeaza instantaneu.


3. Regulile extrase din inregistrare
Penalizarea de intarziere: Daca termini o misiune dupa data limita, primesti doar jumatate din punctele de baza.
Bonusul de streak: Se calculeaza inmultind streak-ul cu 2, dar se plafoneaza la maxim 14 XP si se da doar la prima misiune completata in ziua respectiva.
Formula de nivel: Pentru a trece la nivelul urmator, ai nevoie de nivelul curent inmultit cu 100 XP.
Calculul streak-ului: Se pastreaza daca ai facut o misiune azi sau ieri, luand in calcul fusul orar setat. Daca trece o zi intreaga fara activitate, streak-ul ajunge la zero.
Impactul anularii (undo): Daca anulezi o misiune din trecut, se sterg atat punctele ei, cat si bonusurile luate in zilele urmatoare, pentru ca se rupe seria retroactiv.
Resetarea misiunilor zilnice: Statusul revine la nefinalizat la miezul noptii, conform fusului orar.


4. Arhitectura si decizii asumate
Am facut backend-ul in Fastify si TypeScript, cu better-sqlite3 pentru stocare rapida si luxon pentru a gestiona corect fusurile orare.
Decizia principala a fost legata de stergerea misiunilor: pentru ca anularea unei actiuni din trecut schimba streak-ul din viitor, am ales sa recalculez tot istoricul la fiecare incarcare a paginii, in loc sa tin un numar fix de XP pe care sa-l tot modific. Asta asigura ca nu apar erori de calcul in timp.
Interfata din Next.js e gandita sa fie interactiva si sa arate ca un joc, exact cum cerea brief-ul.


5. Unde este solutia cel mai vulnerabila
Recalcularea intregului istoric la fiecare pas este ideala pentru un singur utilizator. Daca aplicatia ar scala la mii de utilizatori, acest calcul ar incetini serverul si ar trebui sa salvam stadiul zilnic in baza de date ca sa evitam procesarea continua.


6. Utilizarea inteligentei artificiale
Am folosit AI ca sa extrag rapid regulile matematice ascunse in loguri si sa scriu structura vizuala din Tailwind. Logica de business, formulele de timp si baza de date au fost verificate si scrise de mana.


7. Ce probleme am observat si nu le-am reparat
Nu exista o protectie in baza de date care sa te opreasca sa creezi aceeasi misiune de 10 ori in aceeasi secunda daca faci spam pe butonul de adaugare. De asemenea, aplicatia nu are autentificare, oricine avand acces la datele utilizatorului hardcodat.

