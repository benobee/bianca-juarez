import Events from "../modules/events";

const productList = (data, options) => {
    return {
        el: "#app",
        data () {
            const items = this.slimArray(data.items);

            sessionStorage.setItem("access", false);

            if (options.availableToSell === "true") {
                sessionStorage.setItem("access", true);
            }

            return {
                search: {
                    isActive: false,
                    category: "",
                    tag: ""
                },
                categories: this.categoryTags(items, "category"),
                items,
                scrollHeight: 0,
                categoryItems: [],
                currentItems: [],
                hash: location.hash,
                sell: options.availableToSell,
                options,
                pagination: {
                    scrollBottom: false,
                    pageLimit: 15,
                    currentIndex: 0
                },
                lifecycle: {
                    appLoaded: false
                }
            };
        },
        filters: {
            formatPrice (price) {
                price /= 100;
                price = price.toFixed(2).toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");

                return `$${ price}`;
            }
        },
        computed: {
            scrollClasses () {
                let scrolling = "";

                if (this.scrollHeight < -150) {
                    scrolling = "scrolling";
                }

                return scrolling;
            },
            currentList () {
                /* this is the main rendered list outputted to
                the DOM target area */

                //clone the array
                let array = this.items.slice(0);

                if (this.search.isActive) {
                    //store cloned list of items in category
                    array = array.slice(0);

                    this.generateTags(array);

                    const results = [];

                    //filter the array from search criteria
                    array.forEach((item) => {
                        let match = false;

                        item.categories.forEach((filter) => {
                            if (this.search.category === filter) {
                                match = true;
                            }
                        });

                        if (match) {
                            results.push(item);
                        }
                    });

                    return results;
                }

                //paginate the array                                             
                array = this.paginate(array);

                return array;
            },
            canSell () {
                return this.sell;
            },
            appLoaded () {
                let loaded = "";

                if (this.lifecycle.appLoaded) {
                    loaded = "data-loaded";
                }

                return loaded;
            }
        },
        methods: {
            categoryTags (items, type) {
                let categoryArray = [];

                items.forEach((item) => {
                    categoryArray = categoryArray.concat(item.categories);
                });

                categoryArray = this.removeDuplicates(categoryArray);

                return this.filterToObject(categoryArray, type);
            },
            access (url) {
                if (this.sell === "true") {
                    url += "?access=true";
                }

                return url;
            },
            menuOpen (e) {
                e.currentTarget.classList.toggle("menu-open");
            },
            generateUID () {
                let firstPart = (Math.random() * 46656) | 0;
                let secondPart = (Math.random() * 46656) | 0;

                firstPart = (`000${ firstPart.toString(36)}`).slice(-3);
                secondPart = (`000${ secondPart.toString(36)}`).slice(-3);
                return firstPart + secondPart;
            },
            slugify (value) {
                return value.toLowerCase().replace(/ /g, "-").replace(/-&-/g, "-").replace(/[^\w-]+/g, "");
            },
            generateTags (array) {
                //get tags from curent items
                array = this.parseTags(array);

                //if tag is active is search make the item active
                array = array.map((item) => {
                    if (item.tag === this.search.tag) {
                        item.isActive = true;
                    }

                    return item;
                });

                //reactive data change to update render logic
                this.tags = array;
            },
            resetAll () {
                //reset search
                this.search.category = [];
                this.search.tag = "";
                this.cleanupScrollEvents();

                //make all categories inactive to allow fo toggle behaviour
                //tags are always inactive on render
                this.categories.forEach((item) => {
                    this.$set(item, "isActive", false);
                });

                this.bindScrollEvents();
            },
            slimArray (array) {
                //get rid of unnecessary data
                array = array.map((item) => {
                    return {
                        id: item.id,
                        title: item.title,
                        assetUrl: item.assetUrl,
                        categories: item.categories,
                        tags: item.tags,
                        fullUrl: item.fullUrl,
                        items: item.items,
                        price: item.structuredContent.variants[ 0 ].price
                    };
                });

                return array;
            },
            testArray (item, type) {
                return item[ type ] !== !item[ type ] && (Array.isArray(item[ type ]) && item[ type ].length > 0);
            },
            parseTags (array) {
                //look for tag arrays in data and concatinate
                let tags = [];

                array.forEach((item) => {
                    if (this.testArray(item, "tags")) {
                        tags = tags.concat(item.tags);
                    }
                });

                //filter out duplicates
                tags = this.removeDuplicates(tags);

                //re-map as object with active state
                tags = this.filterToObject(tags, "tag");

                return tags;
            },
            removeDuplicates (array) {
                return array.filter((elem, index, self) => {
                    return index === self.indexOf(elem);
                });
            },
            paginate (array) {
                //limit the active items list based on page index to allow for
                //infinite scroll and append
                array = array.splice(0, this.pagination.currentIndex + this.pagination.pageLimit);

                return array;
            },
            bindScrollEvents () {
                window.addEventListener("load", this.executeScrollFunctions);
                window.addEventListener("scroll", this.executeScrollFunctions);
            },
            cleanupScrollEvents () {
                window.removeEventListener("load", this.executeScrollFunctions);
                window.removeEventListener("scroll", this.executeScrollFunctions);
            },
            executeScrollFunctions () {
                const grid = this.$el.querySelector(".collection.grid.product-list");
                const height = window.innerHeight;
                const domRect = grid.getBoundingClientRect();
                const triggerAmount = height - domRect.bottom;
                const body = document.body.getBoundingClientRect();

                this.scrollHeight = body.top;

                if (domRect.top < -250) {
                    Events.emit("show-back-to-top-button", {
                        state: true,
                        distanceAway: domRect.top
                    });
                } else {
                    Events.emit("show-back-to-top-button", { state: false });
                }

                //show next page of pagination list
                this.appendItems(triggerAmount);
            },
            appendItems (triggerAmount) {
                //when the page is scrolled to the bottom of the current items
                //the next set or page of items will be auto appened to the bottom
                if (triggerAmount > 0 && !this.pagination.scrollBottom) {
                    this.pagination.scrollBottom = true;
                    const current = this.pagination.currentIndex;

                    this.pagination.currentIndex = current + this.pagination.pageLimit + 1;
                    this.pagination.scrollBottom = false;
                }
            },
            filterToObject (array, type) {
                //convert filter to object with id and active props
                array = array.map((item) => {

                    const filter = {
                        id: this.generateUID(),
                        [ type ]: item,
                        slug: this.slugify(item),
                        isActive: false
                    };

                    return filter;
                });

                return array;
            },
            scrollTop () {
                let top = 0;

                if (window.innerWidth > 800) {
                    top = 130;
                }

                const params = {
                    top,
                    left: 0
                };

                if (this.scrollHeight > -1500) {
                    params.behavior = "smooth";
                }

                window.scroll(params);
            },
            filterByCategory (item) {
                //category filters
                this.scrollTop();
                this.pagination.currentIndex = 0;

                if (!item.isActive) {
                    this.resetAll();
                    item.isActive = true;
                } else {
                    item.isActive = false;
                }

                if (this.search.category !== item.category) {
                    //toggle between categories
                    this.search.category = item.category;
                    this.search.isActive = true;
                } else {
                    //toggle off if active
                    this.search.isActive = false;
                    this.search.category = "";
                }
            }
        },
        mounted () {
            setTimeout(() => {
                this.lifecycle.appLoaded = true;
                this.bindScrollEvents();
            }, 600);
        }
    };
};

export default productList;