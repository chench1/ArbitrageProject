import 'dotenv/config'

interface Game {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: BookMaker[];
};

interface BookMaker {
  key: string;
  title: string;
  last_update: string;
  markets: Market[];
};

interface Market {
  key: string;
  outcomes: Outcome[];
};

interface Outcome {
  name: string;
  price: number;
};

interface OddsData {
  id: string;
  homeTeam: string;
  awayTeam: string;
  site: string;
  homeOdds: number;
  awayOdds: number;
};

const BASE_URL = "https://api.the-odds-api.com/v4";

async function getSports() {
  const sports_url = `${BASE_URL}/sports?apiKey=${process.env.BETTING_API_KEY}`;
  const sports_data = await fetch(sports_url).then((res) => res.json());
  console.log(sports_data);
}

async function getSportOdds(sport: string) : Promise<OddsData[]> {
  // const odds_url = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds/?apiKey=${process.env.BETTING_API_KEY}&regions=us`

  const odds_url = `${BASE_URL}/sports/${sport}/odds/?apiKey=${process.env.BETTING_API_KEY}&regions=us&oddsFormat=decimal`
  const odds_data = await fetch(odds_url)
  .then((res) => res.json())
  .then((data) => {
    const allPrices = data
      .flatMap((game: Game) => (
        (game.bookmakers || []).map((bookmaker: BookMaker) => {
          // console.log(`${game.commence_time} ${game.home_team} ${game.away_team}`);
          return {
          id: game.id,
          homeTeam: game.home_team,
          awayTeam: game.away_team,
          bookmaker: bookmaker
        }})
      ))
      .flatMap((game: {id: string; homeTeam: string; awayTeam: string; bookmaker: BookMaker}) => (
        game.bookmaker.markets.map((market) => ({
          id: game.id,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          bookmakerName: game.bookmaker.title,
          market: market,
        }))
      ))
      .map((entry: { id: string; homeTeam: string; awayTeam: string; bookmakerName: string; market: Market }) => {
        const outcomes: Outcome[] = entry.market.outcomes;
        if (!outcomes || outcomes.length < 2) {
          return null;
        }

        return {
          id: entry.id,
          homeTeam: entry.homeTeam,
          awayTeam: entry.awayTeam,
          site: entry.bookmakerName,
          homeOdds: (entry.homeTeam === outcomes[0].name) ? outcomes[0].price : outcomes[1].price, 
          awayOdds: (entry.awayTeam === outcomes[1].name) ? outcomes[1].price : outcomes[0].price, 
        };
      })
      .filter((entry: any) => entry !== null);

    // console.log('Grouped Prices:', allPrices);
    return allPrices;
  })
  .catch((error) => console.error('Error:', error));
  return odds_data;
}

function calculateArbitragePercentage(odds: number) : number {
  return ((1 / odds) * 100);
}

function calculateProfit(stake: number, percentage: number) : number {
  return stake / (percentage / 100) - stake;
}

function betAmount(stake: number, odds: OddsData) : {homeBet: number; awayBet: number, profit: number} {
  let totalPercentage = calculateArbitragePercentage(odds.homeOdds) + calculateArbitragePercentage(odds.awayOdds);
  if (totalPercentage > 100) {
    return {homeBet: -1, awayBet: -1, profit: -1};
  }
  return {
    homeBet: (stake * calculateArbitragePercentage(odds.homeOdds)) / totalPercentage,
    awayBet: (stake * calculateArbitragePercentage(odds.awayOdds)) / totalPercentage,
    profit: calculateProfit(stake, totalPercentage)
  };
}

console.log(betAmount(500, {id: 'hi', homeTeam: 'hi', awayTeam: 'hi', site:'hi', homeOdds: 1.18, awayOdds: 7}))

getSportOdds("americanfootball_nfl");