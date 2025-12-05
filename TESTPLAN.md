# Mexico vs Computer - Testplan v2.2.1

## Test Categories

### 1. Eerste Ronde Tests
- [ ] T1.1: Speler gooit 1x blind, computer gooit 1x blind, vergelijk werkt correct
- [ ] T1.2: Speler wint eerste ronde, computer wordt voorgooier ronde 2
- [ ] T1.3: Computer wint eerste ronde, speler wordt voorgooier ronde 2
- [ ] T1.4: Gelijke worp eerste ronde (vastgooier), beide gooien opnieuw
- [ ] T1.5: Speler gooit Mexico in eerste ronde (blind)
- [ ] T1.6: Computer gooit Mexico in eerste ronde (blind)
- [ ] T1.7: Beide gooien Mexico in eerste ronde
- [ ] T1.8: Buttons disabled tijdens computer's beurt

### 2. Voorgooier Pattern Tests
- [ ] T2.1: Speler voorgooier, 1 open worp, computer moet volgen
- [ ] T2.2: Speler voorgooier, 2 open worpen, computer moet volgen
- [ ] T2.3: Speler voorgooier, 3 worpen (open, open, blind), computer moet volgen
- [ ] T2.4: Computer voorgooier, speler moet patroon volgen
- [ ] T2.5: Verkeerde button disabled wanneer patroon verplicht is
- [ ] T2.6: MaxThrows limiet wordt correct gerespecteerd

### 3. Blind Throw Mechanics
- [ ] T3.1: Blind throw toont "???" en vraagt beker zichtbaar
- [ ] T3.2: Beker draait om bij blind throw
- [ ] T3.3: Beker draait terug bij reveal
- [ ] T3.4: Laatste blind throw auto-continues
- [ ] T3.5: Blind Mexico blijft verborgen tot reveal
- [ ] T3.6: Beide blinde worpen onthullen simultaan
- [ ] T3.7: Computer laatste blind throw blijft verborgen tot vergelijking

### 4. AI Decision Making
- [ ] T4.1: Computer gooit door wanneer speler Mexico heeft
- [ ] T4.2: Computer stopt bij goede score (>61)
- [ ] T4.3: AI personality verschilt per ronde
- [ ] T4.4: Gambler's Fallacy trigger werkt
- [ ] T4.5: Loss Aversion trigger werkt
- [ ] T4.6: Computer speelt rationeel met threshold berekening

### 5. Game Flow & State Management
- [ ] T5.1: Levens worden correct bijgewerkt (emoji ⚅→⚀)
- [ ] T5.2: Stats panel update correct (wins/losses/winrate/streak)
- [ ] T5.3: Throw history toont beide spelers correct
- [ ] T5.4: Mexico counter werkt correct (dubbele penalty)
- [ ] T5.5: Game over bij 0 levens
- [ ] T5.6: Nieuw spel reset alles correct

### 6. UI & Visual Tests
- [ ] T6.1: Dark mode kleuren hebben goede contrast
- [ ] T6.2: Twee bekers zichtbaar (bruin/rood)
- [ ] T6.3: Dobbelstenen animeren correct
- [ ] T6.4: Messages tonen correct in history panel
- [ ] T6.5: Debug console toont alle logs
- [ ] T6.6: Mobile responsive (320px-640px)

### 7. Edge Cases & Error Handling
- [ ] T7.1: Snel klikken op buttons (spam clicking)
- [ ] T7.2: Page refresh tijdens spel
- [ ] T7.3: LocalStorage stats persistent
- [ ] T7.4: Multiple Mexico's in één ronde (4x penalty)
- [ ] T7.5: Vastgooier scenario (tie 3x)
- [ ] T7.6: Easter egg: Lucky Mode (5x robot click)

### 8. Button State Tests
- [ ] T8.1: Buttons disabled tijdens animations
- [ ] T8.2: Correct buttons zichtbaar na elke actie
- [ ] T8.3: Pattern enforcement disabled juiste button
- [ ] T8.4: Eerste ronde: alleen blind button zichtbaar
- [ ] T8.5: Na reveal: keep button zichtbaar
- [ ] T8.6: Buttons re-enabled na computer's beurt

## Test Execution Log

### Game 1: [Date/Time]
- **Scenario**:
- **Result**:
- **Issues**:
- **Notes**:

### Game 2-25: [To be documented]

## Known Issues
1. Fixed: Buttons not properly disabled (v2.2.1)
2. Fixed: Game freeze after two dice cups (v2.2)
3. Fixed: Blind throws revealed too early (v2.2)

## Critical Paths to Test
1. **Happy Path**: Eerste ronde → normaal spel → win/loss → nieuwe ronde
2. **Blind Path**: Meerdere blinde worpen → simultaneous reveal
3. **Mexico Path**: Mexico gooien → dubbele penalty → game over
4. **Pattern Path**: Voorgooier pattern → achterligger moet volgen
5. **AI Path**: Computer desperate situation → blijft gooien voor Mexico

## Performance Checks
- [ ] No console errors during gameplay
- [ ] Animations smooth (60fps)
- [ ] setTimeout's execute in correct order
- [ ] No memory leaks after 10+ games
- [ ] Stats localStorage <1MB

## Browser Compatibility
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (iOS)
- [ ] Mobile browsers
