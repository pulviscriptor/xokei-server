# xokei-server #
Server for xokei game.  
Project is in development.

# Starting server #
Run `npm run server` in `xokei-server` folder.

# Testing #
You can run tests to check that everything works correctly.
Navigate to `xokei-server` and run `npm test` to test 1P online game with emulated client trying to cheat and send malicious packets.
It will run same test that `grunt test_server` from `xokei-client` will run.
You can see debug output by setting env variable `DEBUG_TEST` to `true` like: 
linux: 
`DEBUG_TEST=true npm test` 
windows: 
`set DEBUG_TEST=true 
npm test` 

## Testing multiplayer ##
- Automatically:
You need to have place `xokei-client` folder in same folder where `xokei-server` located.
Navigate to `xokei-client` folder and run `grunt test_phantom_multiplayer`
- Manually:
You need to run `npm run test-phantom` and open client-side tests in web-browser.
Check `Running tests manually` part in `xokei-client` readme.
