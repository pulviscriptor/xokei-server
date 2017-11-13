Protocol based on JSON format.  
Each packet is JSON array having `[0]` element `cmd` representing command (`opcode`) and additional data.  
Examples:  
`["welcome","1.0.0"]` where `1.0.0` is version of server  
`["game_won",{"winner":"player1","scores":[6,3]}]`
# Server -> Client #
## welcome ##
`[1]` (`string`) - version of server. Client should disconnect if version mismatch from client's version.