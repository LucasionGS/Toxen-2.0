class Imd {
  /**
   * @param {string} text 
   */
  static MarkDownToHTML(text) {
    // The other which things are written in is very important.
    // It's order to prevent errors or overlaps.

    // Bold Text
    // **text**
    text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Italic Text
    // *text*
    text = text.replace(/\*(.*?)\*/g, "<i>$1</i>");

    // Strike Through
    // ~~text~~
    text = text.replace(/\~\~(.*?)\~\~/g, "<imd style='text-decoration: line-through;'>$1</imd>");

    // Coloured Text.
    // [color=#HEXCOLOR]text[/color]
    text = text.replace(/\[color=(.*?)\](.*?)\[\/color\]/g, "<imd style='color:$1'>$2</imd>");

    // Font Family
    // [font=FONTNAME]text[/font]
    text = text.replace(/\[font=(.*?)\](.*?)\[\/font\]/g, "<imd style='font-family:$1'>$2</imd>");

    // Font Size
    // [size=SIZE]text[/size]
    text = text.replace(/\[size=(.*?)\](.*?)\[\/size\]/g, "<imd style='font-size:$1px'>$2</imd>");

    // Breakline
    // [br]
    text = text.replace(/\[br\]/g, "<br>");

    return text;
  }
}

exports.Imd = Imd;