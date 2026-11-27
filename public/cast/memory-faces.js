export const memoryCharacters={
 KOALA:'🐨', TIGER:'🐯', PENGUIN:'🐧', DOLPHIN:'🐬', OCTOPUS:'🐙', WHALE:'🐳',
 UNICORN:'🦄', DRAGON:'🐉', ROBOT:'🤖', ALIEN:'👽', DINO:'🦖', BUTTERFLY:'🦋',
 BEE:'🐝', SNAIL:'🐌', CRAB:'🦀', FLAMINGO:'🦩', HEDGEHOG:'🦔', SLOTH:'🦥',
 OTTER:'🦦', GIRAFFE:'🦒', PARROT:'🦜', LADYBUG:'🐞', ELEPHANT:'🐘', ZEBRA:'🦓'
};
export function memoryFace(symbol){
 if(memoryCharacters[symbol])return `<span class="memory-shape"><svg viewBox="0 0 100 100" aria-hidden="true"><text x="50" y="78" font-size="72" text-anchor="middle">${memoryCharacters[symbol]}</text></svg></span>`;
 const animals=['FOX','OWL','RABBIT','BEAR','FROG','TURTLE','PANDA','LION'],index=animals.indexOf(symbol);
 if(index>=0)return `<span class="memory-art" style="background-position:${index%3*50}% ${Math.floor(index/3)*50}%"></span>`;
 const shape={STAR:'<path d="m50 9 12 27 30 3-23 20 7 31-26-16-26 16 7-31L8 39l30-3Z" fill="#ffe36b"/>',HEART:'<path d="M50 85 15 52C-7 28 23 4 50 28 77 4 107 28 85 52Z" fill="#ff778c"/>',DIAMOND:'<path d="m50 10 40 40-40 40L10 50Z" fill="#66d5f1"/><path d="m50 10 0 80M10 50h80" opacity=".3"/>',TRIANGLE:'<path d="M50 12 94 87H6Z" fill="#9bdf83"/>'}[symbol];
 return `<span class="memory-shape shape-${symbol.toLowerCase()}"><svg viewBox="0 0 100 100" aria-hidden="true"><g stroke="#213356" stroke-width="3" stroke-linejoin="round">${shape}</g><g fill="#213356"><ellipse cx="38" cy="53" rx="3" ry="4"></ellipse><ellipse cx="62" cy="53" rx="3" ry="4"></ellipse></g><path d="M43 63q7 9 14 0" fill="none" stroke="#213356" stroke-width="3" stroke-linecap="round"/></svg></span>`;
}

export const memorySymbols = ['FOX','OWL','RABBIT','BEAR','FROG','TURTLE','PANDA','LION','STAR','HEART','DIAMOND','TRIANGLE',...Object.keys(memoryCharacters)];
