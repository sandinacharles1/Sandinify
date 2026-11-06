package com.example.sandinify;

//storage system - item : quantity
public class Interview {
    
    //Endpoitn 1: Adding a Item
    @RestController
    @RequestMapping("/api/inventory")
    //Create thje item OR update item if it is currently in our inventory
    @PostMapping("add")
    i
    
    //Endpoint 2: Requesting an Item
    @Endpoint
        //Check to see if quantitiy  availanble is greater than amount requested
        //If it is, remove the amount requested and return 200 OK
        //If not true, return 409
    
        //OUTPUTS:
    //Success:  200 OK
    //FAIlURE (occurs requested more items than in inventory):409
    //FAILURE (occurs ntorywhen when requesting 0 or negative items): 400 BAD request
}
