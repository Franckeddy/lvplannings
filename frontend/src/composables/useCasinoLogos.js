export const useCasinoLogos = () => {
  const casinoLogos = {
    // Noms longs (scraped_tournaments)
    'Aria Casino': 'https://pokeratlas-images-production.s3.amazonaws.com/venues/images/shnQQ41c00L9NJE',
    'Bellagio Casino': 'https://pokeratlas-images-production.s3.amazonaws.com/venues/images/op4dl21vkym5YUo',
    'Caesars Palace': 'https://pokeratlas-images-production.s3.amazonaws.com/venues/images/EQYTGn32XiDgrVQ',
    'Horseshoe Las Vegas': 'https://pokeratlas-images-production.s3.amazonaws.com/venues/images/J9ituMTcB5J4ueg28NA6SQ',
    'MGM Grand': 'https://pokeratlas-images-production.s3.amazonaws.com/venues/images/1-Ax3BUUXNa8g9Y',
    'Mandalay Bay': 'https://pokeratlas-images-production.s3.amazonaws.com/venues/images/1nwIo8LuQp7qjPs',
    'Red Rock Casino': 'https://pokeratlas-images-production.s3.amazonaws.com/venues/images/D7KeLkY076b4iKs',
    'South Point Casino': 'https://pokeratlas-images-production.s3.amazonaws.com/venues/images/qIL0FjVAwaNqIz0',
    'The Orleans Casino': 'https://pokeratlas-images-production.s3.amazonaws.com/venues/images/U9jJz_8UIcDX-qg',
    'Venetian Las Vegas': 'https://pokeratlas-images-production.s3.amazonaws.com/venues/images/tvDnfFSLM6zqb89CCA6oTA',
    'Westgate Las Vegas Resort & Casino': 'https://pokeratlas-images-production.s3.amazonaws.com/venues/images/eIzjK4Jwmk6wdgk',
    'World Series of Poker': 'https://pokeratlas-images-production.s3.amazonaws.com/venues/images/wNC0BE4F89xz8cae4MgA1g',
    'Wynn Las Vegas': 'https://pokeratlas-images-production.s3.amazonaws.com/venues/images/y8YzkAed-seaDik',

    // Noms courts (table tournaments)
    'Aria': 'https://pokeratlas-images-production.s3.amazonaws.com/venues/images/shnQQ41c00L9NJE',
    'The Orleans': 'https://pokeratlas-images-production.s3.amazonaws.com/venues/images/U9jJz_8UIcDX-qg',
    'WSOP': 'https://pokeratlas-images-production.s3.amazonaws.com/venues/images/wNC0BE4F89xz8cae4MgA1g',
    'WSOP Daily': 'https://pokeratlas-images-production.s3.amazonaws.com/venues/images/wNC0BE4F89xz8cae4MgA1g'
  };

  const getCasinoLogo = (casinoName) => {
    return casinoLogos[casinoName] || null;
  };

  const getCasinoInitials = (casinoName) => {
    return casinoName
      .split(' ')
      .filter(word => word.length > 0 && word !== 'Casino' && word !== 'Las' && word !== 'Vegas')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 3);
  };

  return {
    getCasinoLogo,
    getCasinoInitials
  };
};
