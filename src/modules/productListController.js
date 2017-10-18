import Vue from "vue";
import axios from "axios";
import { productList, productListImage, backToTopButton } from "../components/index";
//import JSONData from "./data.json";

const dev = false;

const productListController = {
    init (collection) {
        const options = this.getShopOptions(collection);

        if (dev) {

/*            const data = JSONData;
        
            this.renderGallery(data, options);*/

        } else {

            const hasCachedData = sessionStorage.getItem("shop-data", true);

            if (hasCachedData === "true") {
                const data = JSON.parse(sessionStorage.getItem("shop"));

                //console.log("data fetched from cache");
                this.renderGallery(data, options);
            } else {
                this.getShopData(collection, options);
            }
        }
    },
    getShopOptions (collection) {
        const availableToSell = collection.dataset.prices;

        const tag = collection.dataset.tag;

        const priceMax = collection.dataset.priceMax;

        const priceMin = collection.dataset.priceMin;

        return {
            tag,
            availableToSell,
            priceMax,
            priceMin
        };
    },
    getShopData (collection, options) {
        const params = {
            format: "json"
        };

        const url = collection.dataset.collection;

        axios.get(`/${ url}`, { params })
            .then((response) => {
                if (response.data.items.length > 0) {
                    sessionStorage.setItem("shop-data", true);
                    sessionStorage.setItem("shop", JSON.stringify(response.data));
                    this.renderGallery(response.data, options);
                }
            })
            .catch((error) => {
                if (error.response) {
                    // The request was made and the server responded with a status code 
                    // that falls out of the range of 2xx 
                    console.log(error.response.data);
                    console.log(error.response.status);
                    console.log(error.response.headers);
                } else if (error.request) {
                    // The request was made but no response was received 
                    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of 
                    // http.ClientRequest in node.js 
                    console.log(error.request);
                } else {
                    // Something happened in setting up the request that triggered an Error 
                    console.log("Error", error.message);
                }
                console.log(error.config);
            });
    },
    renderGallery (data, options) {
        //extend components
        Vue.component("back-to-top", backToTopButton);
        Vue.component("image-component", productListImage);

        //render the gallery
        const galleryList = new Vue(productList(data, options));

        return galleryList;
    }
};

export default productListController;