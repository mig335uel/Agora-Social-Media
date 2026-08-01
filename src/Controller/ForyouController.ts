import { getForYouFeed } from "@/Services/FeedService";



export class ForyouController{

    offset: number;
    limit: number;

    constructor() {
        this.offset = 0;
        this.limit = 20;
    }


    async getMorePosts(){
        
        this.offset += this.limit;
        let posts = await getForYouFeed(this.limit, this.offset);
        return posts;
        
    }

    
    
}