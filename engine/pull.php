<?php
/**
 * @author AlexanderC <self@alexanderc.me>
 * @date 10/31/13
 * @time 12:12 PM
 */

exit(
strip_tags(json_decode(file_get_contents("http://randomtext.me/api/lorem/ul-10/5-10/"), true)['text_out'])
. "<a href='http://google.com'> --> google link!</a>");