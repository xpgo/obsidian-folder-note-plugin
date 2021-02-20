# ccard Sample Recipes

## Use multiple `ccard` code blocks in a note to display more.

There can be multiple `ccard` code blocks in a note file. for example, the following code block shows overview of different folders in a single note file.

```
# All my music notes

​```ccard
type: folder_brief_live
folder: media/music
​```

# All my video notes

​```ccard
type: folder_brief_live
folder: media/video
​```
```

## Show card image for customized attachment folder

If you changed the attachment folder path in Obsidian's options >> Files & Links, and use wiki link and short link format for images. You have to use `imagePrefix` key to let card image be shown correctly. For example, if your attachment folder path is `/assets` in the root path. There is an image `/assets/image1.png`, and in a note file with path `/folder1/note1`, you use `![[image1.png]]` to include the image. Then in `ccard` code block with `folder_brief_live`, you should use:

```
​```ccard
type: folder_brief_live
imagePrefix: 'assets/'
​```
```

If you want to use the `imagePrefix` in every folder note, you could insert the above code blocks into the initial content of folder note by the Folder Note Plugin settings.

For statically defined item data:

```
​```ccard
items: [
  {
    title: 'note 1',
    image: 'image1.png'
  }
]
imagePrefix: 'assets/'
​```
```

## Show card image for attachment folder within current folder

If you set the attachment folder path to be within any local folder, use the following codes in initial content definition for Folder Note Plugin (thanks [ibestvina](https://github.com/ibestvina) for suggestion):

```
​```ccard
type: folder_brief_live
imagePrefix: '{{FOLDER_PATH}}/attachments/`
​```
```

## Link to folder note by alias

Since the folder note path is not the real folder path, if you want to link a folder as a normal note, you can use the alias feature of obsidian by using the following codes in initial content definition for Folder Note Plugin (thanks [ibestvina](https://github.com/ibestvina) for suggestion):

```
---
aliases: [{{FOLDER_NAME}}]
---
# {{FOLDER_NAME}}

​```ccard
type: folder_brief_live
imagePrefix: 'attachments/'
​```
```

then Obsidian will automatically convert `[[myfolder]]` to `[[myfolder/_about_.md|myfolder]]`.

