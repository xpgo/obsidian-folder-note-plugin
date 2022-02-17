function my_function (tp,app) {

    var asset_library_path = "Obsidian Vault/Archive/Assets/"

    var file_path = tp.file.path(true)
    file_path = file_path.split('/')
    file_path.pop()
    file_path = file_path.join('/')

    folder_children = app.vault.fileMap[file_path].children

    var items = []

    for (let i = 0; i < folder_children.length; i++) {
        const element = folder_children[i];
        var last_element_item = element.path.split('/')
        last_element_item = last_element_item[last_element_item.length -1]
        if(element.path.substring(element.path.length - 3) !== ".md"){
            
        
            var array_path_split = element.path.split('/')
            var item_title = array_path_split[array_path_split.length -1]

            var item = [
                "\n    {"+
                "\n        title: '"+item_title+"'",
                "\n        image: '"+item_title+".jpg'",
                "\n        brief: ' '",
                "\n        foot: 'Folder'",
                "\n        link: '"+element.path+"/"+last_element_item+".md'",
                "\n    }"
            ]
            item = item.toString()
            items.push(item)
        }
    }

    var card = [
        "```ccard"+
        "\nitems: ["+  
        "\n"+ items+
        "\n]"+
        "\nimagePrefix: "+asset_library_path+
        "\n```"+
        "\n"
    ]

    card = card.toString()

    return card
}

module.exports = my_function