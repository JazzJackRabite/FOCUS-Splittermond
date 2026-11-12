// Generated directly from src/data/splittermond_grw.sqlite
// Total strengths: 43

export interface StrengthData {
    name: string;
    cost: number;
    max: number;
    desc: string;
    multi: boolean;
    source: string;
    page?: number;
    onlyCreation: boolean;
}

export const STRENGTHS_DATA: StrengthData[] = [
    {
        "name": "Attraktivität",
        "cost": 1,
        "max": 1,
        "desc": "Entweder die Erscheinung oder die Stimme des Abenteurers ist von makelloser Schönheit, was ihm bei anderen Personen leichter Sympathien einbringt. Die Einstellung (S. 145) eines Gegenübers ist stets 1 Stufe besser, als es normalerweise der Fall wäre (bis maximal hilfsbereit).",
        "multi": false,
        "source": "GRW",
        "page": 72,
        "onlyCreation": true
    },
    {
        "name": "Ausdauernd",
        "cost": 1,
        "max": 1,
        "desc": "Der Abenteurer kommt bei anstrengenden Tätigkeiten nicht so leicht aus der Puste, sei es im Kampf oder auf einem langen Marsch. Bei Zähigkeit-Proben zur Abwehr des Zustands Erschöpft (S. 168) erhält er einen Bonus in Höhe von 3 Punkten. Außerdem werden Abzüge durch den Zustand Erschöpft halbiert. Für die Berechnung von Überanstrengung (S. 175) gilt die KON als verdoppelt.",
        "multi": false,
        "source": "GRW",
        "page": 72,
        "onlyCreation": false
    },
    {
        "name": "Bastler",
        "cost": 1,
        "max": 1,
        "desc": "Der Abenteurer ist ein geborener Improvisationskünstler. Fehlt ihm das passende Werkzeug, kann er die negativen Auswirkungen teilweise umgehen: Die negativen Umstände durch fehlendes Werkzeug (siehe S. 94) gelten für ihn als um eine Stufe vermindert (fast unmöglich wird zu stark negativ, stark negativ zu leicht negativ, leicht negativ führt zu keinen Abzügen). Beim improvisierten Handwerk (siehe S. 143) erhält er außerdem einen Bonus in Höhe von 3 Punkten.",
        "multi": false,
        "source": "GRW",
        "page": 72,
        "onlyCreation": false
    },
    {
        "name": "Dämmersicht",
        "cost": 2,
        "max": 1,
        "desc": "Die Augen des Abenteurers haben sich an dunkle Umgebungen angepasst. Die vorherrschenden Lichtverhältnisse (S. 169) gelten für ihn als um 2 Stufen verbessert, sofern nicht Finsternis herrscht.",
        "multi": false,
        "source": "GRW",
        "page": 72,
        "onlyCreation": true
    },
    {
        "name": "Einen Schritt voraus",
        "cost": 2,
        "max": 1,
        "desc": "Der Abenteurer versteht es besser als üblich, die ihm zur Verfügung stehenden Mittel zu seinem Vorteil zu nutzen. Der maximale Bonus auf Proben und abgeleitete Werte (S. 18) ist für ihn für jede Quelle um 1 Punkt erhöht.",
        "multi": false,
        "source": "GRW",
        "page": 72,
        "onlyCreation": false
    },
    {
        "name": "Entfernungssinn",
        "cost": 2,
        "max": 1,
        "desc": "Der Abenteurer benötigt im Fernkampf immer einen Erfolgsgrad weniger, um weiter entfernte Ziele zu treffen.",
        "multi": false,
        "source": "GRW",
        "page": 72,
        "onlyCreation": false
    },
    {
        "name": "Erhöhte Fokusregeneration",
        "cost": 2,
        "max": 1,
        "desc": "Der Abenteurer gewinnt magische Kraft deutlich schneller zurück. Bei der Regeneration von Verzehrtem Fokus in einer Ruhephase wird die Willenskraft verdreifacht statt verdoppelt.",
        "multi": false,
        "source": "GRW",
        "page": 72,
        "onlyCreation": false
    },
    {
        "name": "Erhöhte Lebensregeneration",
        "cost": 2,
        "max": 1,
        "desc": "Die Verwundungen des Abenteurers heilen deutlich schneller. Bei der Regeneration von verlorenen Lebenspunkten in einer Ruhephase wird die Konstitution verdreifacht statt verdoppelt.",
        "multi": false,
        "source": "GRW",
        "page": 72,
        "onlyCreation": false
    },
    {
        "name": "Erhöhter Fokuspool",
        "cost": 2,
        "max": 20,
        "desc": "Der Abenteurer vermag es, ein größeres Maß an magischer Kraft durch seinen Körper zu leiten. Er erhält 5 zusätzliche Fokuspunkte. Diese Stärke ist beliebig oft wählbar.",
        "multi": true,
        "source": "GRW",
        "page": 72,
        "onlyCreation": false
    },
    {
        "name": "Erwählter der [Wesen]",
        "cost": 1,
        "max": 1,
        "desc": "Wesen eines bestimmten Typus sind dem Abenteurer äußerst wohlgesonnen. Ihre Einstellung (S. 145) gilt ihm gegenüber stets als um 2 Stufen verbessert. Die Stärke ist mehrfach wählbar und gilt dann immer für einen anderen Typus. Als wählbare Typen kommen alle in der folgenden Liste genannten infrage: Felswesen, Feuerwesen, Geisterwesen, Lichtwesen, Naturwesen, Schattenwesen, Untoter, Wasserwesen, Windwesen",
        "multi": true,
        "source": "GRW",
        "page": 72,
        "onlyCreation": true
    },
    {
        "name": "Feensinn",
        "cost": 1,
        "max": 1,
        "desc": "Der Abenteurer kann sich durch feeisches Erbe deutlich besser in der Welt der Feen orientieren. Sämtliche Proben zur Orientierung in Feenwelten erhalten einen Bonus in Höhe von 6 Punkten. Der Abenteurer erhält außerdem einen Bonus in Höhe von 2 Punkten auf seinen Geistigen Widerstand gegen Magie, die von Wesen des Typus Feenwesen gewirkt wird.",
        "multi": false,
        "source": "GRW",
        "page": 72,
        "onlyCreation": true
    },
    {
        "name": "Feine Nase",
        "cost": 1,
        "max": 1,
        "desc": "Die Nase des Abenteurers nimmt eine Vielzahl von Aromen und Gerüchen wahr. Er erhält einen Bonus in Höhe von 2 Punkten auf Wahrnehmung-Proben, wenn der Geruchssinn betroffen ist.",
        "multi": false,
        "source": "GRW",
        "page": 72,
        "onlyCreation": true
    },
    {
        "name": "Flink",
        "cost": 1,
        "max": 1,
        "desc": "Der Abenteurer verfügt über eine angeborene Schnelligkeit. Seine Geschwindigkeit steigt um 1 Punkt.",
        "multi": false,
        "source": "GRW",
        "page": 72,
        "onlyCreation": true
    },
    {
        "name": "Gesellig",
        "cost": 1,
        "max": 1,
        "desc": "Der Umgang mit Kulturschaffenden liegt dem Abenteurer im Blut. Hält er sich mindestens eine Woche lang in einer größeren Gemeinschaft auf, erhält er temporär bis zu seiner Abreise die Ressource Kontakte 1 für diese Gemeinschaft, sofern er bisher keine entsprechenden Kontakte besitzt.",
        "multi": false,
        "source": "GRW",
        "page": 72,
        "onlyCreation": false
    },
    {
        "name": "Giftresistenz",
        "cost": 1,
        "max": 1,
        "desc": "Der Abenteurer ist besonders resistent gegen Gifte (S. 175). Kommt er mit einem entsprechenden Stoff in Kontakt, gilt sein Körperlicher Widerstand als um 2 Punkte erhöht. Auf Zähigkeit-Proben zum Widerstand gegen Gift erhält er einen Bonus in Höhe von 3 Punkten.",
        "multi": false,
        "source": "GRW",
        "page": 72,
        "onlyCreation": false
    },
    {
        "name": "Gleichgewichtssinn",
        "cost": 1,
        "max": 1,
        "desc": "Der Abenteurer hat eine ausgezeichnete Körperbeherrschung. Jede Fertigkeitsprobe, um auf den Beinen zu bleiben oder zu balancieren, erhält einen Bonus in Höhe von 3 Punkten.",
        "multi": false,
        "source": "GRW",
        "page": 72,
        "onlyCreation": false
    },
    {
        "name": "Gutes Gedächtnis",
        "cost": 1,
        "max": 1,
        "desc": "Der Abenteurer hat ein ausgezeichnetes Gedächtnis. Jede Probe, um sich an etwas zu erinnern oder Wissen abzurufen (siehe S. 150), erhält einen Bonus in Höhe von 3 Punkten. Der Spielleiter kann den Spieler außerdem auf Details hinweisen, an die sich der Abenteurer vielleicht erinnert, auch wenn der Spieler dies nicht tut.",
        "multi": false,
        "source": "GRW",
        "page": 72,
        "onlyCreation": true
    },
    {
        "name": "Hitzeresistenz",
        "cost": 1,
        "max": 1,
        "desc": "Hohe Temperaturen schränken den Abenteurer kaum ein. Die Hitzestufe (S. 174) gilt für ihn als um 1 Stufe gesenkt. Auf Zähigkeit-Proben zum Widerstand gegen Hitze erhält er einen Bonus in Höhe von 3 Punkten.",
        "multi": false,
        "source": "GRW",
        "page": 73,
        "onlyCreation": false
    },
    {
        "name": "Hoher Geistiger Widerstand",
        "cost": 2,
        "max": 4,
        "desc": "Der Abenteurer verfügt über einen unbeugsamen Geist und ist nur schwerlich zu beeinflussen. Sein Geistiger Widerstand ist um 2 Punkte erhöht. Diese Stärke kann einmal pro Heldengrad gewählt werden, bis zu einem maximalen Bonus in Höhe von 8 Punkten.",
        "multi": true,
        "source": "GRW",
        "page": 73,
        "onlyCreation": false
    },
    {
        "name": "Hoher Körperlicher Widerstand",
        "cost": 2,
        "max": 4,
        "desc": "Der Körper des Abenteurers widersteht selbst stärksten Belastungen. Sein Körperlicher Widerstand ist um 2 Punkte erhöht. Diese Stärke kann einmal pro Heldengrad gewählt werden, bis zu einem maximalen Bonus in Höhe von 8 Punkten.",
        "multi": true,
        "source": "GRW",
        "page": 73,
        "onlyCreation": false
    },
    {
        "name": "Konzentrationsstärke",
        "cost": 1,
        "max": 1,
        "desc": "Dank seinem eisernen Willen ist es sehr schwer, den Abenteurer von einer Tätigkeit abzulenken. Er erhält einen Bonus in Höhe von 3 Punkten auf Entschlossenheit-Proben, wenn seine Konzentration (etwa beim Zaubern) gestört wird.",
        "multi": false,
        "source": "GRW",
        "page": 73,
        "onlyCreation": false
    },
    {
        "name": "Krankheitsresistenz",
        "cost": 1,
        "max": 1,
        "desc": "Der Abenteurer ist besonders resistent gegen Krankheiten (S. 176). Kommt er mit einer solchen in Kontakt, gilt sein Körperlicher Widerstand als um 2 Punkte erhöht. Auf Zähigkeit-Proben zum Widerstand gegen Krankheiten erhält er einen Bonus in Höhe von 3 Punkten.",
        "multi": false,
        "source": "GRW",
        "page": 73,
        "onlyCreation": false
    },
    {
        "name": "Kulturkunde",
        "cost": 1,
        "max": 1,
        "desc": "Der Abenteurer kennt sich intuitiv mit den Sitten und Bräuchen einer bestimmten Region oder eines Volkes (etwa im Umfang eines Kultur-Moduls) aus. Im sozialen Umgang mit Personen, die dieselbe Kulturkunde besitzen, erhält der Abenteurer einen leicht positiven Umstand (Bonus in Höhe von 2 Punkten). Voraussetzung: Beherrschung der Muttersprache der Kultur.",
        "multi": true,
        "source": "GRW",
        "page": 73,
        "onlyCreation": false
    },
    {
        "name": "Kälteresistenz",
        "cost": 1,
        "max": 1,
        "desc": "Der Abenteurer ist an den Aufenthalt in frostigen Gebieten gewöhnt. Die Kältestufe (S. 175) gilt für ihn als um 1 Stufe gesenkt. Auf Zähigkeit-Proben zum Widerstand gegen Kälte erhält er einen Bonus in Höhe von 3 Punkten.",
        "multi": false,
        "source": "GRW",
        "page": 73,
        "onlyCreation": false
    },
    {
        "name": "Lastesel",
        "cost": 1,
        "max": 3,
        "desc": "Für die Berechnung der Last gilt die Stärke als um 1 Punkt erhöht (ergibt 2 Punkte Last extra). Diese Stärke kann bis zu dreimal gewählt werden. Die Verwendung dieser Stärke ist nur bei gleichzeitiger Nutzung der Optionalregel zur Traglast (S. 181) sinnvoll.",
        "multi": true,
        "source": "GRW",
        "page": 73,
        "onlyCreation": false
    },
    {
        "name": "Literat",
        "cost": 1,
        "max": 1,
        "desc": "Der Abenteurer hat gelernt zu lesen und zu schreiben. Er beherrscht automatisch die Schriften aller von ihm beherrschten Sprachen. Ohne diese Stärke ist ein Abenteurer des Lesens und Schreibens nicht mächtig.",
        "multi": false,
        "source": "GRW",
        "page": 73,
        "onlyCreation": false
    },
    {
        "name": "Natürliche Waffe",
        "cost": 1,
        "max": 1,
        "desc": "Der Abenteurer verfügt über scharfe Krallen oder spitze Zähne, die er im Kampf einsetzen kann. Im unbewaffneten Nahkampf kann er nach Wahl echten Schaden anstelle von Betäubungsschaden anrichten.",
        "multi": false,
        "source": "GRW",
        "page": 73,
        "onlyCreation": true
    },
    {
        "name": "Natürlicher Rüstungsschutz",
        "cost": 2,
        "max": 1,
        "desc": "Die Haut des Abenteurers ist von einem dichten Fell bedeckt oder auf andere Weise besonders widerstandsfähig, was ihm eine Schadensreduktion von 1 einbringt.",
        "multi": false,
        "source": "GRW",
        "page": 73,
        "onlyCreation": true
    },
    {
        "name": "Orientierungssinn",
        "cost": 1,
        "max": 1,
        "desc": "Der Abenteurer verfügt über ein besonderes Gespür für die Himmelsrichtung. Er erhält stets einen Bonus in Höhe von 3 Punkten auf alle Proben zur Orientierung.",
        "multi": false,
        "source": "GRW",
        "page": 73,
        "onlyCreation": false
    },
    {
        "name": "Priester",
        "cost": 0,
        "max": 1,
        "desc": "Der Abenteurer ist ein geweihter Priester seiner Gottheit. Er bezieht Magie nicht mehr aus der Umgebung, sondern direkt und ausschließlich von seinem Gott. Dadurch hat seine Magie nie negativen Einfluss auf die Umwelt gemäß der Angaben auf der Tabelle zu Fokus und Umgebung (siehe S. 197). Im Gegenzug kann sein Gott ihm bei groben Verstößen gegen die Prinzipien des Kultes den Zugang zur Magie temporär verwehren – die Entscheidung dazu liegt letzten Endes beim Spielleiter. Bei Patzern würfelt er außerdem nicht auf die Patzertabelle für Magier, sondern auf die für Priester (siehe S. 200). Er erhält niemals echten Schaden durch fehlgeschlagene Zauber, das Band zu seinem Gott und sein Selbstvertrauen können aber erschüttert werden. Diese Stärke kostet keine Punkte, da sich Vor- und Nachteile etwa aufwiegen.",
        "multi": false,
        "source": "GRW",
        "page": 73,
        "onlyCreation": false
    },
    {
        "name": "Robust",
        "cost": 2,
        "max": 3,
        "desc": "Der Abenteurer kann deutlich mehr Schaden einstecken als andere Personen gleicher Statur. Auf jeder Gesundheitsstufe erhält er 1 zusätzlichen Lebenspunkt. Diese Stärke kann bis zu dreimal gewählt werden.",
        "multi": true,
        "source": "GRW",
        "page": 73,
        "onlyCreation": false
    },
    {
        "name": "Scharfe Sicht",
        "cost": 1,
        "max": 1,
        "desc": "Die Augen des Abenteurers sind scharf wie die eines Falken. Er erhält einen Bonus in Höhe von 2 Punkten auf Wahrnehmung-Proben, wenn die Sicht betroffen ist.",
        "multi": false,
        "source": "GRW",
        "page": 73,
        "onlyCreation": true
    },
    {
        "name": "Scharfes Gehör",
        "cost": 1,
        "max": 1,
        "desc": "Die Ohren des Abenteurers nehmen selbst leiseste Geräusche wahr. Er erhält einen Bonus in Höhe von 2 Punkten auf Wahrnehmung-Proben, wenn das Gehör betroffen ist.",
        "multi": false,
        "source": "GRW",
        "page": 73,
        "onlyCreation": true
    },
    {
        "name": "Schmerzresistenz",
        "cost": 2,
        "max": 1,
        "desc": "Schmerzen können dem Abenteurer weniger anhaben. Wundabzüge (siehe S. 172) sind für ihn stets um 1 Punkt verringert.",
        "multi": false,
        "source": "GRW",
        "page": 73,
        "onlyCreation": false
    },
    {
        "name": "Soziales Gespür",
        "cost": 1,
        "max": 1,
        "desc": "Der Abenteurer kann außergewöhnlich gut mit anderen Personen umgehen und besitzt ein Gespür für die Stimmung seines Gegenübers. Wird er in einen Sozialen Konflikt verwickelt, erhält er einen Bonus in Höhe von 2 Punkten auf alle damit verbundenen Proben.",
        "multi": false,
        "source": "GRW",
        "page": 73,
        "onlyCreation": false
    },
    {
        "name": "Stabile Magie",
        "cost": 1,
        "max": 1,
        "desc": "Die Magie des Abenteurers wirkt auf besonders stabile Art und Weise. Wenn er beim Zaubern einen verheerenden Misserfolg oder einen Patzer würfelt, kann er in der Tabelle für Verheerende Zauberauswirkungen eine Stufe abziehen. Sollte er dadurch unter die niedrigste Stufe fallen, entfallen die Auswirkungen aus der Tabelle.",
        "multi": false,
        "source": "GRW",
        "page": 73,
        "onlyCreation": false
    },
    {
        "name": "Tierfreund",
        "cost": 1,
        "max": 1,
        "desc": "Der Abenteurer hat eine besonders positive Ausstrahlung auf Tiere. Jede Probe im Umgang mit Wesen des Typus Tier erhält einen Bonus in Höhe von 1 Punkt. Wesen des Typus Tier zeigen ihm gegenüber zudem immer eine um eine Stufe verbesserte Einstellung.",
        "multi": false,
        "source": "GRW",
        "page": 74,
        "onlyCreation": false
    },
    {
        "name": "Tiervertrauter",
        "cost": 1,
        "max": 1,
        "desc": "Der Abenteurer hat ein besonders intensives Schicksalsband zu einem Tier geknüpft, dass ihn im Rahmen der Ressource Kreatur begleitet. Er spürt stets den Gesundheitszustand des Tieres, selbst wenn es weit von ihm entfernt ist. Außerdem ist das Tier ihm gegenüber bedingungslos loyal. Die Stärke ermöglicht darüber hinaus das Erlernen spezieller Vertrautenmagie. Sollte der Tiervertraute irgendwann sterben, kann der Abenteurer eine neue Bindung zu einem anderen Tier der gleichen Art eingehen.",
        "multi": false,
        "source": "GRW",
        "page": 74,
        "onlyCreation": false
    },
    {
        "name": "Verbesserte Initiative",
        "cost": 2,
        "max": 1,
        "desc": "Der Abenteurer ist besonders reaktionsschnell. Seine Intuition gilt für die Bestimmung der Initiative als um 3 Punkte erhöht.",
        "multi": false,
        "source": "GRW",
        "page": 74,
        "onlyCreation": false
    },
    {
        "name": "Weltgewandt",
        "cost": 1,
        "max": 1,
        "desc": "Der Abenteurer hat ein Gespür für fremde Kulturen und gewöhnt sich schnell an neue Bräuche und Sitten. Hält er sich mindestens eine Woche lang in einer fremden Region auf, erhält er temporär bis zu seiner Abreise einen Bonus in Höhe von 2 Punkten im Umgang mit Personen der fremden Kultur.",
        "multi": false,
        "source": "GRW",
        "page": 74,
        "onlyCreation": false
    },
    {
        "name": "Zielstrebig",
        "cost": 1,
        "max": 1,
        "desc": "Wenn der Abenteurer sich erst einmal etwas in den Kopf gesetzt hat, ist er nicht so leicht davon abzubringen. Wenn er diese Stärke erwirbt, sucht er sich ein Ziel aus. Dies kann eine konkrete Handlung sein (das Reinwaschen des eigenen Namens) oder ein abstraktes Ideal (der Kampf gegen Ungerechtigkeit in der Welt). Immer, wenn der Abenteurer dieses Ziel direkt verfolgt, erhält er einen Bonus in Höhe von 2 Punkten auf Körperlichen Widerstand und Geistigen Widerstand, auf Entschlossenheit und Zähigkeit. Sollte das Ziel jemals erreicht sein, kann sich der Abenteurer ein neues Ziel setzen. Dies ist aber höchstens einmal pro Jahr möglich.",
        "multi": false,
        "source": "GRW",
        "page": 74,
        "onlyCreation": false
    },
    {
        "name": "Zusätzliche Splitterpunkte",
        "cost": 2,
        "max": 1,
        "desc": "Das Schicksal ist dem Abenteurer in besonderem Maße gewogen. Er erhält 2 zusätzliche Splitterpunkte.",
        "multi": false,
        "source": "GRW",
        "page": 74,
        "onlyCreation": true
    },
    {
        "name": "Zäh",
        "cost": 1,
        "max": 1,
        "desc": "Es ist sehr schwer, den Abenteurer ins Totenreich zu schicken. Erhält er den Zustand Sterbend, verdoppelt sich die Zeit bis zum Verlust einer Gesundheitsstufe.",
        "multi": false,
        "source": "GRW",
        "page": 74,
        "onlyCreation": false
    }
];
